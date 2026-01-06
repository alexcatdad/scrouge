interface DashboardStatsProps {
  subscriptions: any[] | undefined;
  upcomingBills: any[] | undefined;
  totalCosts: Record<string, number> | undefined;
}

export function DashboardStats({ subscriptions, upcomingBills, totalCosts }: DashboardStatsProps) {
  const activeSubscriptions = subscriptions?.filter(sub => sub.isActive).length || 0;
  const upcomingCount = upcomingBills?.length || 0;
  
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 text-sm">📱</span>
            </div>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Active Subscriptions</p>
            <p className="text-2xl font-semibold text-gray-900">{activeSubscriptions}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-yellow-600 text-sm">⏰</span>
            </div>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Upcoming Bills</p>
            <p className="text-2xl font-semibold text-gray-900">{upcomingCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 text-sm">💰</span>
            </div>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Monthly Total</p>
            <div className="text-lg font-semibold text-gray-900">
              {totalCosts && Object.keys(totalCosts).length > 0 ? (
                Object.entries(totalCosts).map(([currency, amount]) => (
                  <div key={currency}>
                    {formatCurrency(amount, currency)}
                  </div>
                ))
              ) : (
                <span className="text-2xl">$0.00</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600 text-sm">📊</span>
            </div>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Avg per Service</p>
            <p className="text-2xl font-semibold text-gray-900">
              {totalCosts && activeSubscriptions > 0 ? (
                formatCurrency(
                  Object.values(totalCosts)[0] / activeSubscriptions,
                  Object.keys(totalCosts)[0] || 'USD'
                )
              ) : (
                '$0.00'
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
