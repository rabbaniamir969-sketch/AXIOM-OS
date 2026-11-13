import type { CoreSettings } from '../types/axiom'

type CoreSettingsPanelProps = {
  settings: CoreSettings
  onSettingChange: <T extends keyof CoreSettings>(key: T, value: CoreSettings[T]) => void
}

export default function CoreSettingsPanel({ settings, onSettingChange }: CoreSettingsPanelProps) {
  return (
    <section className="page-block">
      <div className="page-header">
        <div>
          <span className="eyebrow accent">CORE SETTINGS</span>
          <h1>Pengaturan inti AXIOM</h1>
        </div>
      </div>

      <div className="settings-list">
        <label className="setting-row">
          <div>
            <strong>Penyimpanan otomatis</strong>
            <small>Simpan status modul dan konfigurasi setelah perubahan.</small>
          </div>
          <input
            type="checkbox"
            checked={settings.autoSave}
            onChange={(event) => onSettingChange('autoSave', event.target.checked)}
          />
        </label>

        <label className="setting-row">
          <div>
            <strong>Mode developer</strong>
            <small>Aktifkan log detail dan debugging lanjutan.</small>
          </div>
          <input
            type="checkbox"
            checked={settings.developerMode}
            onChange={(event) => onSettingChange('developerMode', event.target.checked)}
          />
        </label>

        <label className="setting-row">
          <div>
            <strong>Notifikasi sistem</strong>
            <small>Izinkan notifikasi dari AXIOM CORE.</small>
          </div>
          <input
            type="checkbox"
            checked={settings.pushNotifications}
            onChange={(event) => onSettingChange('pushNotifications', event.target.checked)}
          />
        </label>

        <label className="setting-row select-row">
          <div>
            <strong>Tema visual</strong>
            <small>Pilih skema warna AXIOM OS.</small>
          </div>
          <select value={settings.theme} onChange={(event) => onSettingChange('theme', event.target.value as CoreSettings['theme'])}>
            <option value="midnight">Midnight</option>
            <option value="aurora">Aurora</option>
          </select>
        </label>
      </div>
    </section>
  )
}
