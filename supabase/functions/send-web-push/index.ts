import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const configuredOrigin = Deno.env.get('APP_ORIGIN') ?? ''
const nativeOrigins = new Set(['https://localhost', 'capacitor://localhost'])

function getCorsHeaders(request: Request) {
  const origin = request.headers.get('Origin')
  const allowedOrigin = origin && (origin === configuredOrigin || nativeOrigins.has(origin))
    ? origin
    : configuredOrigin

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

type StoredPushSubscription = {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

type StoredPushDevice = {
  id: string
  token: string
}

function base64UrlEncode(value: string | Uint8Array): string {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  }
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function decodePem(value: string): Uint8Array {
  const encoded = value
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '')
  const binary = atob(encoded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

async function createFcmAccessToken(clientEmail: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const unsignedToken = [
    base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })),
    base64UrlEncode(JSON.stringify({
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })),
  ].join('.')
  const key = await crypto.subtle.importKey(
    'pkcs8',
    decodePem(privateKeyPem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = new Uint8Array(await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsignedToken),
  ))
  const assertion = `${unsignedToken}.${base64UrlEncode(signature)}`
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  if (!tokenResponse.ok) {
    console.error('FCM OAuth token request failed', { status: tokenResponse.status })
    throw new Error('Could not authenticate with Firebase Cloud Messaging.')
  }

  const tokenResult: { access_token?: string } = await tokenResponse.json()
  if (!tokenResult.access_token) throw new Error('Firebase did not return an access token.')
  return tokenResult.access_token
}

Deno.serve(async (request: Request) => {
  const corsHeaders = getCorsHeaders(request)

  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders })
  }

  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return Response.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidSubject = Deno.env.get('VAPID_SUBJECT')
  const fcmProjectId = Deno.env.get('FCM_PROJECT_ID')
  const fcmClientEmail = Deno.env.get('FCM_CLIENT_EMAIL')
  const fcmPrivateKey = Deno.env.get('FCM_PRIVATE_KEY')

  if (!supabaseUrl || !anonKey || !vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return Response.json({ error: 'Push service is not configured' }, { status: 503, headers: corsHeaders })
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: 'Invalid session' }, { status: 401, headers: corsHeaders })
  }

  let payload: { title?: unknown; body?: unknown; url?: unknown }
  try {
    payload = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400, headers: corsHeaders })
  }

  if (typeof payload.title !== 'string' || typeof payload.body !== 'string') {
    return Response.json({ error: 'Title and body are required' }, { status: 400, headers: corsHeaders })
  }

  const title = payload.title.trim().slice(0, 80)
  const body = payload.body.trim().slice(0, 240)
  const rawUrl = typeof payload.url === 'string' ? payload.url : '/#notifications'
  const targetUrl = rawUrl.startsWith('/') && !rawUrl.startsWith('//') ? rawUrl : '/#notifications'

  if (!title || !body) {
    return Response.json({ error: 'Title and body cannot be empty' }, { status: 400, headers: corsHeaders })
  }

  const [{ data: subscriptions, error: subscriptionsError }, { data: devices, error: devicesError }] = await Promise.all([
    supabase.from('push_subscriptions').select('id, subscription').eq('user_id', user.id),
    supabase.from('push_devices').select('id, token').eq('user_id', user.id),
  ])
  if (subscriptionsError || devicesError) {
    return Response.json({ error: 'Could not load push destinations' }, { status: 500, headers: corsHeaders })
  }
  if (!subscriptions?.length && !devices?.length) {
    return Response.json({ delivered: 0, failed: 0 }, { headers: corsHeaders })
  }

  const expiredIds: string[] = []
  const expiredDeviceIds: string[] = []
  const warnings: string[] = []
  let delivered = 0
  let failed = 0

  if (subscriptions?.length) {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
    await Promise.all(subscriptions.map(async (row: { id: string; subscription: StoredPushSubscription }) => {
      try {
        await webpush.sendNotification(row.subscription, JSON.stringify({ title, body, url: targetUrl }))
        delivered += 1
      } catch (pushError) {
        const statusCode = (pushError as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) expiredIds.push(row.id)
        else console.error('Web Push delivery failed', { subscriptionId: row.id, statusCode })
        failed += 1
      }
    }))
  }

  if (devices?.length) {
    if (!fcmProjectId || !fcmClientEmail || !fcmPrivateKey) {
      failed += devices.length
      warnings.push('Pengiriman Android belum dikonfigurasi pada Edge Function.')
    } else {
      try {
        const accessToken = await createFcmAccessToken(fcmClientEmail, fcmPrivateKey)
        await Promise.all(devices.map(async (device: StoredPushDevice) => {
          try {
            const response = await fetch(
              `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(fcmProjectId)}/messages:send`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  message: {
                    token: device.token,
                    notification: { title, body },
                    data: { url: targetUrl },
                  },
                }),
              },
            )
            const responseBody = await response.text()
            let result: { error?: { status?: string; details?: Array<{ errorCode?: string }> } } = {}
            try {
              result = responseBody ? JSON.parse(responseBody) : {}
            } catch {
              throw new Error('Firebase returned an invalid response.')
            }

            if (!response.ok) {
              if (response.status === 404 || result.error?.details?.some((detail) => detail.errorCode === 'UNREGISTERED')) {
                expiredDeviceIds.push(device.id)
              }
              console.error('FCM delivery failed', { deviceId: device.id, status: response.status })
              failed += 1
              return
            }

            delivered += 1
          } catch (pushError) {
            console.error('FCM delivery request failed', {
              deviceId: device.id,
              message: pushError instanceof Error ? pushError.message : 'Unknown error',
            })
            failed += 1
          }
        }))
      } catch (configurationError) {
        console.error('FCM authentication failed', configurationError instanceof Error ? configurationError.message : 'Unknown error')
        failed += devices.length
        warnings.push('Autentikasi Firebase Cloud Messaging gagal. Periksa konfigurasi Firebase di Supabase Secrets.')
      }
    }
  }

  if (expiredIds.length || expiredDeviceIds.length) {
    const cleanupResults = await Promise.all([
      expiredIds.length ? supabase.from('push_subscriptions').delete().in('id', expiredIds) : Promise.resolve({ error: null }),
      expiredDeviceIds.length ? supabase.from('push_devices').delete().in('id', expiredDeviceIds) : Promise.resolve({ error: null }),
    ])
    for (const result of cleanupResults) {
      if (result.error) console.error('Could not remove expired push destination', result.error.message)
    }
  }

  return Response.json({ delivered, failed, warnings }, { headers: corsHeaders })
})
