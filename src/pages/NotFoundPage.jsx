import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="card mt-6">
      <EmptyState
        icon={Compass}
        title="الصفحة غير موجودة"
        description="الرابط الذي فتحته غير متاح داخل التطبيق."
        action={
          <Link to="/">
            <Button variant="primary">الرجوع إلى الرئيسية</Button>
          </Link>
        }
      />
    </div>
  )
}
