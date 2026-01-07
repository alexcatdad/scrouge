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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const stats = [
    {
      label: "Active Subscriptions",
      value: activeSubscriptions.toString(),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      iconBg: "from-primary/20 to-primary/5",
      iconBorder: "border-primary/20",
      iconColor: "text-primary",
      cardClass: "stat-card-gold",
    },
    {
      label: "Upcoming Bills",
      value: upcomingCount.toString(),
      subtitle: "Next 30 days",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconBg: "from-accent-coral/20 to-accent-coral/5",
      iconBorder: "border-accent-coral/20",
      iconColor: "text-accent-coral",
      cardClass: "",
    },
    {
      label: "Monthly Total",
      value: totalCosts && Object.keys(totalCosts).length > 0
        ? Object.entries(totalCosts).map(([currency, amount]) => formatCurrency(amount, currency)).join(' + ')
        : "$0",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconBg: "from-accent-teal/20 to-accent-teal/5",
      iconBorder: "border-accent-teal/20",
      iconColor: "text-accent-teal",
      cardClass: "stat-card-teal",
    },
    {
      label: "Avg per Service",
      value: totalCosts && activeSubscriptions > 0
        ? formatCurrency(Object.values(totalCosts)[0] / activeSubscriptions, Object.keys(totalCosts)[0] || 'USD')
        : "$0",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      iconBg: "from-[#a78bfa]/20 to-[#a78bfa]/5",
      iconBorder: "border-[#a78bfa]/20",
      iconColor: "text-[#a78bfa]",
      cardClass: "",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className={`stat-card ${stat.cardClass} animate-fade-in-up`}
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.iconBg} border ${stat.iconBorder} flex items-center justify-center`}>
              <span className={stat.iconColor}>{stat.icon}</span>
            </div>
          </div>
          <div>
            <p className="text-secondary text-sm font-medium mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-white tracking-tight">{stat.value}</p>
            {stat.subtitle && (
              <p className="text-secondary/60 text-xs mt-1">{stat.subtitle}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
