/** Read-only totals used by the dashboard and the data hub. */
import { repository as repo } from '../data/repository'
import { listActivity } from './activity'

function activeCount(rows) {
  return rows.filter((row) => !row.deletedAt).length
}

export async function getOverviewCounts() {
  const [customers, suppliers, items, workers, categories, units] = await Promise.all([
    repo.all('customers'),
    repo.all('suppliers'),
    repo.all('items'),
    repo.all('workers'),
    repo.all('categories'),
    repo.all('units'),
  ])

  return {
    customers: activeCount(customers),
    suppliers: activeCount(suppliers),
    items: activeCount(items),
    workers: activeCount(workers),
    itemCategories: categories.filter((row) => row.kind === 'item' && !row.deletedAt).length,
    expenseCategories: categories.filter((row) => row.kind === 'expense' && !row.deletedAt).length,
    units: activeCount(units),
  }
}

export function getRecentActivity(limit = 8) {
  return listActivity(limit)
}
