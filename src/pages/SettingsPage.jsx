import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BadgeCheck,
  CloudUpload,
  Coins,
  HardDriveDownload,
  Hash,
  Info,
  KeyRound,
  Lock,
  PackageOpen,
  Percent,
  Save,
  ShieldCheck,
  Store,
} from 'lucide-react'
import { useAuth } from '../app/AuthContext'
import { useSettings } from '../app/SettingsContext'
import { useToast } from '../app/ToastContext'
import { setPin, verifyPin } from '../services/settings'
import { backupStatus } from '../services/backup'
import { getStorageEstimate, isStorageLow, isStoragePersisted, requestPersistentStorage } from '../services/storage'
import { APP_VERSION } from '../lib/appInfo'
import { SCHEMA_VERSION } from '../data/db'
import { DIGIT_STYLES, localizeDigits } from '../lib/digits'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { Field, Input, Select, Textarea } from '../components/ui/Field'
import { PageHeader } from '../components/ui/PageHeader'
import { LogoUpload } from '../components/LogoUpload'
import { InstallButton } from '../components/InstallButton'

function SaveRow({ dirty, saving, onSave }) {
  return (
    <div className="flex items-center justify-between gap-3 pt-1">
      <span className="text-[12px] text-muted">{dirty ? 'تغييرات غير محفوظة' : 'محفوظ'}</span>
      <Button variant="primary" onClick={onSave} disabled={!dirty || saving}>
        <Save size={16} />
        {saving ? 'جارٍ الحفظ…' : 'حفظ'}
      </Button>
    </div>
  )
}

function Toggle({ checked, onChange, label, hint, disabled = false }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[14px] font-semibold text-ink">{label}</p>
        {hint && <p className="mt-0.5 text-[12.5px] leading-6 text-muted">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors disabled:opacity-40 ${
          checked ? 'justify-start bg-ink' : 'justify-end bg-line'
        }`}
      >
        <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
      </button>
    </div>
  )
}

/* ---------- profile ---------- */

function ProfileSection() {
  const { settings, update } = useSettings()
  const toast = useToast()
  const profile = settings.profile
  const [form, setForm] = useState(profile)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => setForm(profile), [profile])
  const dirty = JSON.stringify(form) !== JSON.stringify(profile)

  const handleSave = async () => {
    if (!form.shopName.trim()) {
      setErrors({ shopName: 'اسم المعرض مطلوب' })
      return
    }
    setSaving(true)
    try {
      await update({ profile: form }, { note: 'تعديل بيانات المعرض' })
      toast.success('تم حفظ بيانات المعرض')
    } catch (error) {
      toast.error(error.message || 'تعذر الحفظ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader icon={Store} title="بيانات المعرض" description="تظهر في رأس الفواتير والتقارير." />
      <div className="space-y-4 px-5 py-4">
        <LogoUpload value={form.logoDataUrl || ''} onChange={(value) => setForm({ ...form, logoDataUrl: value })} />

        <Field label="اسم المعرض" htmlFor="shop-name" required error={errors.shopName}>
          <Input
            id="shop-name"
            value={form.shopName}
            onChange={(event) => {
              setForm({ ...form, shopName: event.target.value })
              setErrors({})
            }}
            invalid={Boolean(errors.shopName)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="رقم الهاتف" htmlFor="shop-phone">
            <Input
              id="shop-phone"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              inputMode="tel"
              dir="ltr"
            />
          </Field>
          <Field label="العنوان" htmlFor="shop-address">
            <Input
              id="shop-address"
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
            />
          </Field>
        </div>

        <Field label="ملاحظة أسفل الفاتورة" htmlFor="shop-footer" hint="مثال: البضاعة المباعة لا تُرد بعد ١٤ يوماً">
          <Textarea
            id="shop-footer"
            value={form.footerNote}
            onChange={(event) => setForm({ ...form, footerNote: event.target.value })}
          />
        </Field>

        <SaveRow dirty={dirty} saving={saving} onSave={handleSave} />
      </div>
    </Card>
  )
}

/* ---------- numbers & digits ---------- */

function NumbersSection() {
  const { settings, update } = useSettings()
  const toast = useToast()
  const [currencyLabel, setCurrencyLabel] = useState(settings.currency.label)
  const [saving, setSaving] = useState(false)

  useEffect(() => setCurrencyLabel(settings.currency.label), [settings.currency.label])

  const saveCurrency = async () => {
    if (!currencyLabel.trim()) {
      toast.error('اكتب رمز العملة')
      return
    }
    setSaving(true)
    try {
      await update({ currency: { label: currencyLabel.trim() } }, { note: 'تعديل رمز العملة' })
      toast.success('تم حفظ العملة')
    } finally {
      setSaving(false)
    }
  }

  const setDigits = async (value) => {
    try {
      await update({ display: { digits: value } }, { note: 'تغيير شكل الأرقام' })
    } catch (error) {
      toast.error(error.message || 'تعذر الحفظ')
    }
  }

  const digits = settings.display.digits

  return (
    <Card>
      <CardHeader icon={Coins} title="الأرقام والعملة" description="رمز العملة وشكل الأرقام في كل الشاشات." />
      <div className="space-y-4 px-5 py-4">
        <div className="flex items-end gap-3">
          <Field label="رمز العملة" htmlFor="currency-label" className="max-w-40 flex-1">
            <Input
              id="currency-label"
              value={currencyLabel}
              onChange={(event) => setCurrencyLabel(event.target.value)}
              maxLength={6}
            />
          </Field>
          <Button variant="secondary" onClick={saveCurrency} disabled={saving || currencyLabel === settings.currency.label}>
            حفظ
          </Button>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-ink">شكل الأرقام</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {DIGIT_STYLES.map((style) => (
              <button
                key={style.value}
                type="button"
                onClick={() => setDigits(style.value)}
                className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-start transition-colors ${
                  digits === style.value ? 'border-ink bg-canvas' : 'border-line bg-surface hover:bg-canvas'
                }`}
                aria-pressed={digits === style.value}
              >
                <span className="text-[14px] font-semibold text-ink">
                  {style.value === 'western' ? 'أرقام إنجليزية' : 'أرقام عربية'}
                </span>
                <span className="tabular text-[16px] text-muted">{style.sample}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[12.5px] text-muted">
            معاينة: {localizeDigits('1,250.00', digits)} {settings.currency.label}
          </p>
        </div>
      </div>
    </Card>
  )
}

/* ---------- vat ---------- */

function VatSection() {
  const { settings, update } = useSettings()
  const toast = useToast()
  const vat = settings.vat
  const [rate, setRate] = useState(String(vat.rate))
  const [saving, setSaving] = useState(false)

  useEffect(() => setRate(String(vat.rate)), [vat.rate])

  const save = async (patch, note) => {
    try {
      await update({ vat: patch }, { note })
    } catch (error) {
      toast.error(error.message || 'تعذر الحفظ')
    }
  }

  const saveRate = async () => {
    const value = Number(rate)
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      toast.error('نسبة الضريبة يجب أن تكون بين ٠ و ١٠٠')
      return
    }
    setSaving(true)
    try {
      await save({ rate: value }, 'تعديل نسبة الضريبة')
      toast.success('تم حفظ النسبة')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader icon={Percent} title="ضريبة القيمة المضافة" description="مغلقة افتراضياً — لن تظهر في أي فاتورة حتى تشغّلها." />
      <div className="space-y-4 px-5 py-4">
        <Toggle
          label="تشغيل الضريبة"
          hint="عند الإيقاف لا تظهر أي حقول أو أرقام ضريبية."
          checked={vat.enabled}
          onChange={(value) => save({ enabled: value }, value ? 'تشغيل الضريبة' : 'إيقاف الضريبة')}
        />

        <div className={`grid gap-4 transition-opacity sm:grid-cols-2 ${vat.enabled ? '' : 'pointer-events-none opacity-50'}`}>
          <div className="flex items-end gap-3">
            <Field label="النسبة %" htmlFor="vat-rate" className="flex-1">
              <Input
                id="vat-rate"
                value={rate}
                onChange={(event) => setRate(event.target.value)}
                inputMode="decimal"
                dir="ltr"
                disabled={!vat.enabled}
              />
            </Field>
            <Button variant="secondary" onClick={saveRate} disabled={!vat.enabled || saving || String(vat.rate) === rate}>
              حفظ
            </Button>
          </div>
        </div>

        <div className={vat.enabled ? '' : 'pointer-events-none opacity-50'}>
          <Toggle
            label="الأسعار تشمل الضريبة"
            hint="عند التشغيل تُستخرج الضريبة من السعر بدلاً من إضافتها."
            checked={vat.pricesIncludeVat}
            disabled={!vat.enabled}
            onChange={(value) => save({ pricesIncludeVat: value }, 'تعديل طريقة حساب الضريبة')}
          />
        </div>
      </div>
    </Card>
  )
}

/* ---------- numbering ---------- */

const PREFIX_FIELDS = [
  { key: 'sale', label: 'فاتورة بيع' },
  { key: 'purchase', label: 'فاتورة شراء' },
  { key: 'receipt', label: 'سند قبض' },
  { key: 'payment', label: 'سند صرف' },
  { key: 'expense', label: 'مصروف' },
]

function NumberingSection() {
  const { settings, update } = useSettings()
  const toast = useToast()
  const numbering = settings.numbering
  const [deviceCode, setDeviceCode] = useState(numbering.deviceCode)
  const [prefixes, setPrefixes] = useState(numbering.prefixes)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDeviceCode(numbering.deviceCode)
    setPrefixes(numbering.prefixes)
  }, [numbering])

  const dirty = deviceCode !== numbering.deviceCode || JSON.stringify(prefixes) !== JSON.stringify(numbering.prefixes)
  const previewCode = (deviceCode || 'A').toUpperCase()

  const handleSave = async () => {
    const cleanCode = String(deviceCode).trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3)
    if (!cleanCode) {
      toast.error('كود الجهاز مطلوب')
      return
    }
    const cleanPrefixes = Object.fromEntries(
      Object.entries(prefixes).map(([key, value]) => [key, String(value || '').trim().toUpperCase()]),
    )
    setSaving(true)
    try {
      await update(
        { numbering: { deviceCode: cleanCode, prefixes: cleanPrefixes } },
        'تعديل ترقيم الفواتير',
      )
      toast.success('تم حفظ الترقيم')
    } catch (error) {
      toast.error(error.message || 'تعذر الحفظ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader
        icon={Hash}
        title="ترقيم الفواتير"
        description="بادئة النوع + كود الجهاز + رقم متسلسل لا يتكرر."
      />
      <div className="space-y-4 px-5 py-4">
        <Field label="كود الجهاز" htmlFor="device-code" hint="حرف إلى ثلاثة أحرف. يغيّر أرقام الفواتير الجديدة فقط.">
          <Input
            id="device-code"
            value={deviceCode}
            onChange={(event) => setDeviceCode(event.target.value.toUpperCase().slice(0, 3))}
            className="max-w-32 text-center tracking-widest"
            dir="ltr"
            maxLength={3}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          {PREFIX_FIELDS.map((field) => (
            <Field key={field.key} label={field.label} htmlFor={`prefix-${field.key}`}>
              <Input
                id={`prefix-${field.key}`}
                value={prefixes[field.key] || ''}
                onChange={(event) =>
                  setPrefixes({ ...prefixes, [field.key]: event.target.value.toUpperCase().slice(0, 5) })
                }
                dir="ltr"
                maxLength={5}
              />
            </Field>
          ))}
        </div>

        <p className="rounded-xl bg-canvas px-3 py-2.5 text-[12.5px] text-muted">
          معاينة: <span className="tabular font-semibold text-ink">{prefixes.sale || 'SAL'}-{previewCode}-0001</span>
        </p>

        <SaveRow dirty={dirty} saving={saving} onSave={handleSave} />
      </div>
    </Card>
  )
}

/* ---------- stock ---------- */

function StockSection() {
  const { settings, update } = useSettings()
  const toast = useToast()
  const stock = settings.stock
  const [threshold, setThreshold] = useState(String(stock.lowStockThreshold ?? 0))
  const [saving, setSaving] = useState(false)

  useEffect(() => setThreshold(String(stock.lowStockThreshold ?? 0)), [stock.lowStockThreshold])

  const save = async (patch, note) => {
    try {
      await update({ stock: patch }, { note })
      toast.success('تم الحفظ')
    } catch (error) {
      toast.error(error.message || 'تعذر الحفظ')
    }
  }

  const saveThreshold = async () => {
    const value = Number(threshold)
    if (!Number.isFinite(value) || value < 0) {
      toast.error('اكتب رقماً صحيحاً')
      return
    }
    setSaving(true)
    try {
      await save({ lowStockThreshold: value }, 'تعديل حد التنبيه الافتراضي')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader icon={PackageOpen} title="المخزون" description="كيف يتصرف النظام عند نقص الرصيد." />
      <div className="space-y-4 px-5 py-4">
        <Field label="سياسة الرصيد السالب" htmlFor="negative-policy">
          <Select
            id="negative-policy"
            value={stock.negativePolicy}
            onChange={(event) => save({ negativePolicy: event.target.value }, 'تعديل سياسة الرصيد السالب')}
          >
            <option value="block">منع البيع بدون رصيد</option>
            <option value="warn">تنبيه مع السماح (افتراضي)</option>
            <option value="allow">السماح بدون تنبيه</option>
          </Select>
        </Field>

        <div className="flex items-end gap-3">
          <Field label="حد التنبيه الافتراضي" htmlFor="stock-threshold" className="max-w-48 flex-1" hint="0 = التنبيه عند النفاد فقط">
            <Input
              id="stock-threshold"
              value={threshold}
              onChange={(event) => setThreshold(event.target.value)}
              inputMode="decimal"
              dir="ltr"
            />
          </Field>
          <Button variant="secondary" onClick={saveThreshold} disabled={saving || String(stock.lowStockThreshold) === threshold}>
            حفظ
          </Button>
        </div>
      </div>
    </Card>
  )
}

/* ---------- security ---------- */

const AUTO_LOCK_OPTIONS = [
  { value: 1, label: 'دقيقة واحدة' },
  { value: 5, label: '٥ دقائق' },
  { value: 10, label: '١٠ دقائق' },
  { value: 15, label: '١٥ دقيقة' },
  { value: 30, label: '٣٠ دقيقة' },
  { value: 60, label: 'ساعة' },
  { value: 0, label: 'بدون قفل تلقائي' },
]

function SecuritySection() {
  const { settings, update } = useSettings()
  const toast = useToast()
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const saveAutoLock = async (value) => {
    try {
      await update({ security: { autoLockMinutes: Number(value) } }, 'تعديل مدة القفل التلقائي')
      toast.success('تم الحفظ')
    } catch (err) {
      toast.error(err.message || 'تعذر الحفظ')
    }
  }

  const handleChangePin = async (event) => {
    event.preventDefault()
    setError('')
    if (!/^\d{4,6}$/.test(newPin)) {
      setError('الرمز الجديد يجب أن يكون من ٤ إلى ٦ أرقام')
      return
    }
    if (newPin !== confirmPin) {
      setError('الرمزان الجديدان غير متطابقين')
      return
    }
    setSaving(true)
    try {
      const ok = await verifyPin(currentPin)
      if (!ok) {
        setError('الرمز الحالي غير صحيح')
        return
      }
      await setPin(newPin)
      setCurrentPin('')
      setNewPin('')
      setConfirmPin('')
      toast.success('تم تغيير رمز الدخول')
    } catch (err) {
      setError(err.message || 'تعذر تغيير الرمز')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader icon={ShieldCheck} title="القفل والأمان" description="رمز الدخول ومدة القفل التلقائي عند عدم الاستخدام." />
      <div className="space-y-5 px-5 py-4">
        <Field label="القفل التلقائي" htmlFor="auto-lock" hint="بعد هذه المدة بدون استخدام يُطلب الرمز مرة أخرى.">
          <Select
            id="auto-lock"
            value={String(settings.security.autoLockMinutes ?? 5)}
            onChange={(event) => saveAutoLock(event.target.value)}
            className="max-w-56"
          >
            {AUTO_LOCK_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <form onSubmit={handleChangePin} className="space-y-3 rounded-xl border border-line p-4">
          <div className="flex items-center gap-2 text-ink">
            <KeyRound size={17} aria-hidden="true" />
            <h3 className="text-[14.5px] font-semibold">تغيير رمز الدخول</h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="الرمز الحالي" htmlFor="current-pin">
              <Input
                id="current-pin"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={currentPin}
                onChange={(event) => setCurrentPin(event.target.value.replace(/\D/g, ''))}
                className="tabular text-center tracking-widest"
              />
            </Field>
            <Field label="الرمز الجديد" htmlFor="new-pin">
              <Input
                id="new-pin"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={newPin}
                onChange={(event) => setNewPin(event.target.value.replace(/\D/g, ''))}
                className="tabular text-center tracking-widest"
              />
            </Field>
            <Field label="تأكيد الرمز" htmlFor="confirm-pin">
              <Input
                id="confirm-pin"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={confirmPin}
                onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ''))}
                className="tabular text-center tracking-widest"
              />
            </Field>
          </div>

          {error && <p className="text-[13px] font-medium text-danger">{error}</p>}

          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={saving || !currentPin || !newPin || !confirmPin}>
              {saving ? 'جارٍ التغيير…' : 'تغيير الرمز'}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  )
}

/* ---------- backup reminder ---------- */

function BackupSettingsSection() {
  const { settings, update, date } = useSettings()
  const toast = useToast()
  const status = backupStatus(settings)

  const save = async (value) => {
    try {
      await update({ backup: { reminderDays: Number(value) } }, 'تعديل تذكير النسخ الاحتياطي')
      toast.success('تم الحفظ')
    } catch (error) {
      toast.error(error.message || 'تعذر الحفظ')
    }
  }

  return (
    <Card>
      <CardHeader icon={HardDriveDownload} title="النسخ الاحتياطي" description="تذكير دوري بحفظ نسخة خارج الجهاز." />
      <div className="space-y-4 px-5 py-4">
        <Field label="التذكير كل" htmlFor="reminder-days">
          <Select
            id="reminder-days"
            value={String(settings.backup.reminderDays)}
            onChange={(event) => save(event.target.value)}
            className="max-w-56"
          >
            <option value="1">يوم</option>
            <option value="3">٣ أيام</option>
            <option value="7">أسبوع</option>
            <option value="14">أسبوعان</option>
            <option value="30">شهر</option>
          </Select>
        </Field>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-canvas px-3 py-2.5">
          <p className="text-[13px] text-muted">
            آخر نسخة: <span className="font-semibold text-ink">{status.never ? 'لم تُنشأ بعد' : date(status.lastBackupAt)}</span>
          </p>
          <Link to="/backup" className="text-[13px] font-semibold text-walnut hover:underline">
            صفحة النسخ الاحتياطي
          </Link>
        </div>
      </div>
    </Card>
  )
}

/* ---------- cloud backup (coming later) ---------- */

function CloudBackupSection() {
  return (
    <Card>
      <CardHeader
        icon={CloudUpload}
        title="النسخ الاحتياطي السحابي"
        description="نسخة على الإنترنت تُستعاد من أي جهاز. غير متاح في هذا الإصدار."
        action={<Badge tone="sand">قريباً</Badge>}
      />
      <div className="space-y-4 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] leading-6 text-muted">
            سيتم رفع نسخة كاملة من بياناتك تلقائياً، واستعادتها على جهاز جديد بنفس الرقم السري.
          </p>
          <Button variant="secondary" disabled aria-disabled="true">
            <CloudUpload size={16} />
            قريباً
          </Button>
        </div>

        <p className="rounded-xl bg-canvas px-3 py-2.5 text-[12.5px] leading-6 text-muted">
          حتى ذلك الحين استخدم النسخة الاحتياطية العادية: ملف واحد يحفظ كل البيانات ويعمل بدون إنترنت.
        </p>
      </div>
    </Card>
  )
}

/* ---------- storage ---------- */

function formatBytes(bytes) {
  if (!bytes) return '0'
  const units = ['بايت', 'ك.ب', 'م.ب', 'ج.ب']
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

function StorageSection() {
  const toast = useToast()
  const [persisted, setPersisted] = useState(null)
  const [estimate, setEstimate] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setPersisted(await isStoragePersisted())
    setEstimate(await getStorageEstimate())
  }

  useEffect(() => {
    void load()
  }, [])

  const handlePersist = async () => {
    setBusy(true)
    try {
      const ok = await requestPersistentStorage()
      await load()
      if (ok) toast.success('تم تأمين مساحة البيانات على الجهاز')
      else toast.info('المتصفح لم يمنح التخزين الدائم — البيانات محفوظة لكن قد يحذفها المتصفح عند امتلاء الجهاز')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader icon={Lock} title="مساحة البيانات" description="كل البيانات محفوظة داخل هذا المتصفح." />
      <div className="space-y-3 px-5 py-4">
        <div className="flex items-center justify-between gap-3 rounded-xl bg-canvas px-3 py-2.5">
          <span className="text-[13px] text-muted">التخزين الدائم</span>
          <span className={`text-[13px] font-semibold ${persisted ? 'text-success' : 'text-warn'}`}>
            {persisted === null ? '…' : persisted ? 'مؤمَّن' : 'غير مؤمَّن'}
          </span>
        </div>

        {estimate && (
          <div>
            <div className="flex items-center justify-between text-[12.5px] text-muted">
              <span>المستخدم: {formatBytes(estimate.usage)}</span>
              <span>المتاح: {formatBytes(estimate.quota)}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-canvas">
              <div
                className={`h-full rounded-full ${isStorageLow(estimate) ? 'bg-danger' : 'bg-ink'}`}
                style={{ width: `${Math.max(2, estimate.percent)}%` }}
              />
            </div>
          </div>
        )}

        {isStorageLow(estimate) && (
          <div className="rounded-xl border border-danger/25 bg-danger-soft px-3 py-2.5 text-[12.5px] font-semibold text-[#912018]">
            المساحة تقترب من الامتلاء ({Math.round(estimate.percent)}%). صدّر نسخة احتياطية الآن من صفحة النسخ
            الاحتياطي قبل أن يرفض المتصفح حفظ بيانات جديدة.
          </div>
        )}

        {!persisted && (
          <Button variant="secondary" size="sm" onClick={handlePersist} disabled={busy}>
            {busy ? 'جارٍ الطلب…' : 'تأمين التخزين'}
          </Button>
        )}
      </div>
    </Card>
  )
}

/* ---------- about ---------- */

function AboutSection() {
  const { lock } = useAuth()
  const { settings } = useSettings()

  return (
    <Card>
      <CardHeader icon={Info} title="عن التطبيق" description="نظام المعرض — يعمل بالكامل بدون إنترنت." />
      <div className="space-y-3 px-5 py-4">
        <dl className="divide-y divide-line overflow-hidden rounded-xl border border-line text-[13px]">
          <div className="flex items-center justify-between px-3 py-2.5">
            <dt className="text-muted">الإصدار</dt>
            <dd className="tabular font-semibold text-ink">{APP_VERSION}</dd>
          </div>
          <div className="flex items-center justify-between px-3 py-2.5">
            <dt className="text-muted">إصدار قاعدة البيانات</dt>
            <dd className="tabular font-semibold text-ink">{SCHEMA_VERSION}</dd>
          </div>
          <div className="flex items-center justify-between px-3 py-2.5">
            <dt className="text-muted">كود الجهاز</dt>
            <dd className="tabular font-semibold text-ink">{settings.numbering.deviceCode}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap items-center gap-2">
          <InstallButton variant="secondary" size="sm" />
          <Button variant="ghost" size="sm" onClick={lock}>
            <Lock size={15} />
            قفل الآن
          </Button>
        </div>

        <p className="flex items-start gap-2 text-[12px] leading-6 text-muted">
          <BadgeCheck size={15} className="mt-1 shrink-0 text-walnut" aria-hidden="true" />
          المرحلة الأولى: الإعدادات والبيانات الأساسية والنسخ الاحتياطي. المبيعات والمشتريات والمخزون
          والمرتبات في المراحل القادمة.
        </p>
      </div>
    </Card>
  )
}

export function SettingsPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="الإعدادات" description="كل ما يخص المعرض والضريبة والأرقام والأمان." />
      <ProfileSection />
      <NumbersSection />
      <VatSection />
      <NumberingSection />
      <StockSection />
      <SecuritySection />
      <BackupSettingsSection />
      <CloudBackupSection />
      <StorageSection />
      <AboutSection />
    </div>
  )
}
