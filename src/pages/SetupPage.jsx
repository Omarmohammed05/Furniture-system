import { useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck, Store } from 'lucide-react'
import { useAuth } from '../app/AuthContext'
import { useToast } from '../app/ToastContext'
import { BrandMark } from '../components/BrandMark'
import { LogoUpload } from '../components/LogoUpload'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import { PasswordInput } from '../components/ui/PasswordInput'
import { isValidPin } from '../lib/pin'

const STEPS = ['بيانات المعرض', 'رمز الدخول', 'جاهز للبدء']

export function SetupPage() {
  const { finishSetup, busy } = useAuth()
  const toast = useToast()

  const [step, setStep] = useState(0)
  const [profile, setProfile] = useState({ shopName: '', phone: '', address: '', logoDataUrl: '' })
  const [errors, setErrors] = useState({})
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [pinError, setPinError] = useState('')

  const setField = (key, value) => {
    setProfile((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const goToPin = () => {
    if (!profile.shopName.trim()) {
      setErrors({ shopName: 'اسم المعرض مطلوب' })
      return
    }
    setStep(1)
  }

  const goToSummary = () => {
    if (!isValidPin(pin)) {
      setPinError('الرمز يجب أن يكون من ٤ إلى ٦ أرقام')
      return
    }
    if (pin !== pinConfirm) {
      setPinError('الرمزان غير متطابقين')
      return
    }
    setPinError('')
    setStep(2)
  }

  const handleFinish = async () => {
    try {
      await finishSetup({
        shopName: profile.shopName,
        phone: profile.phone,
        address: profile.address,
        logoDataUrl: profile.logoDataUrl,
        pin,
      })
    } catch (error) {
      toast.error(error.message || 'تعذر إكمال الإعداد')
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-10">
      <div className="mb-7 flex flex-col items-center text-center">
        <BrandMark size={56} />
        <h1 className="mt-4 text-[26px] leading-9 font-bold text-ink">نظام المعرض</h1>
        <p className="mt-1 text-[14px] text-muted">إعداد أول مرة — أقل من دقيقة</p>
      </div>

      <div className="w-full max-w-xl">
        <ol className="mb-5 flex items-center justify-center gap-2" aria-label="خطوات الإعداد">
          {STEPS.map((label, index) => (
            <li key={label} className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold ${
                  index <= step ? 'bg-solid text-on-solid' : 'bg-surface text-muted ring-1 ring-line'
                }`}
              >
                {index + 1}
              </span>
              <span className={`text-[12.5px] font-semibold ${index === step ? 'text-ink' : 'text-muted'}`}>{label}</span>
              {index < STEPS.length - 1 && <span className="mx-1 hidden h-px w-6 bg-line sm:block" />}
            </li>
          ))}
        </ol>

        <div className="card px-5 py-6 sm:px-7">
          {step === 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-ink">
                <Store size={20} aria-hidden="true" />
                <h2 className="text-[18px] font-bold">بيانات المعرض</h2>
              </div>
              <p className="text-[13px] leading-6 text-muted">تظهر هذه البيانات في رأس كل فاتورة وتقرير لاحقاً.</p>

              <Field label="اسم المعرض" htmlFor="shopName" required error={errors.shopName}>
                <Input
                  id="shopName"
                  value={profile.shopName}
                  onChange={(event) => setField('shopName', event.target.value)}
                  placeholder="معرض السند للأثاث"
                  invalid={Boolean(errors.shopName)}
                  autoFocus
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="رقم الهاتف" htmlFor="phone" hint="يُستخدم لواتساب لاحقاً">
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(event) => setField('phone', event.target.value)}
                    placeholder="01xxxxxxxxx"
                    inputMode="tel"
                    dir="ltr"
                  />
                </Field>
                <Field label="العنوان" htmlFor="address">
                  <Input
                    id="address"
                    value={profile.address}
                    onChange={(event) => setField('address', event.target.value)}
                    placeholder="المدينة — الشارع"
                  />
                </Field>
              </div>

              <Field label="شعار المعرض" hint="اختياري — يمكن إضافته لاحقاً">
                <LogoUpload value={profile.logoDataUrl} onChange={(value) => setField('logoDataUrl', value)} />
              </Field>

              <div className="flex items-center justify-end pt-2">
                <Button variant="primary" size="lg" onClick={goToPin}>
                  متابعة
                  <ArrowLeft size={18} />
                </Button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-ink">
                <ShieldCheck size={20} aria-hidden="true" />
                <h2 className="text-[18px] font-bold">رمز الدخول</h2>
              </div>
              <p className="text-[13px] leading-6 text-muted">
                رمز من ٤ إلى ٦ أرقام يفتح به التطبيق. يُحفظ على هذا الجهاز فقط ولا يُرسل لأي مكان.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="الرمز" htmlFor="pin">
                  <PasswordInput
                    id="pin"
                    inputMode="numeric"
                    maxLength={6}
                    value={pin}
                    onChange={(event) => {
                      setPin(event.target.value.replace(/\D/g, ''))
                    }}
                    autoFocus
                    placeholder="••••"
                    className="tabular h-12 text-center text-[20px] tracking-[0.4em]"
                  />
                </Field>
                <Field label="تأكيد الرمز" htmlFor="pinConfirm">
                  <PasswordInput
                    id="pinConfirm"
                    inputMode="numeric"
                    maxLength={6}
                    value={pinConfirm}
                    onChange={(event) => setPinConfirm(event.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="tabular h-12 text-center text-[20px] tracking-[0.4em]"
                  />
                </Field>
              </div>

              {pinError && <p className="text-[13px] font-medium text-danger">{pinError}</p>}

              <p className="rounded-xl bg-canvas px-3 py-2.5 text-[12.5px] leading-6 text-muted">
                احتفظ بهذا الرمز في مكان آمن — إذا نسيته لا يمكن استرجاع البيانات إلا من نسخة احتياطية.
              </p>

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(0)}>
                  <ArrowRight size={17} />
                  السابق
                </Button>
                <Button variant="primary" size="lg" onClick={goToSummary}>
                  متابعة
                  <ArrowLeft size={18} />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-ink">
                <CheckCircle2 size={20} aria-hidden="true" />
                <h2 className="text-[18px] font-bold">كل شيء جاهز</h2>
              </div>

              <dl className="divide-y divide-line overflow-hidden rounded-xl border border-line">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <dt className="text-[13px] text-muted">اسم المعرض</dt>
                  <dd className="text-[14px] font-semibold text-ink">{profile.shopName}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <dt className="text-[13px] text-muted">رقم الهاتف</dt>
                  <dd className="text-[14px] font-semibold text-ink" dir="ltr">
                    {profile.phone || '—'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <dt className="text-[13px] text-muted">رمز الدخول</dt>
                  <dd className="text-[14px] font-semibold text-ink">تم ضبطه ({pin.length} أرقام)</dd>
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <dt className="text-[13px] text-muted">كود الجهاز</dt>
                  <dd className="text-[14px] font-semibold text-ink">A — يمكن تغييره من الإعدادات</dd>
                </div>
              </dl>

              <p className="rounded-xl bg-sand px-3 py-2.5 text-[12.5px] leading-6 text-walnut">
                التطبيق يعمل بدون إنترنت بعد أول تحميل، وكل البيانات تُخزَّن على هذا الجهاز. أنشئ نسخة
                احتياطية بانتظام من صفحة النسخ الاحتياطي.
              </p>

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(1)} disabled={busy}>
                  <ArrowRight size={17} />
                  السابق
                </Button>
                <Button variant="primary" size="lg" onClick={handleFinish} disabled={busy}>
                  {busy ? 'جارٍ الإعداد…' : 'ابدأ استخدام النظام'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
