'use client'

import { useEffect, useState, useCallback } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Header }              from './Header'
import { SourceTabs }          from './SourceTabs'
import { LoadingOverlay }      from './LoadingOverlay'
import { EmptyState }          from './EmptyState'
import { KPIGrid }             from './ga4/KPIGrid'
import { EcommerceSection }    from './ga4/EcommerceSection'
import { SessionsTrendChart }  from './ga4/SessionsTrendChart'
import { TrafficSourcesChart } from './ga4/TrafficSourcesChart'
import { TopPagesTable }       from './ga4/TopPagesTable'
import { DeviceGeoSection }    from './ga4/DeviceGeoSection'
import { useGA4Data }          from '@/hooks/useGA4Data'
import { useRefresh }          from '@/hooks/useRefresh'
import { defaultDateRange }    from '@/lib/utils'
import type { DateRange, DataSource } from '@/lib/types'

export function DashboardShell() {
  const [dateRange,    setDateRange]    = useState<DateRange>(defaultDateRange)
  const [activeSource, setActiveSource] = useState<DataSource>('ga4')

  const { data, loading: dataLoading, error: dataError, fetchData } = useGA4Data()
  const { status: refreshStatus, progressMessage, trigger, cancel } = useRefresh()

  // Auto-load existing data on mount and whenever date range changes
  useEffect(() => {
    fetchData(dateRange)
  }, [dateRange, fetchData])

  const handleDateChange = useCallback((range: DateRange) => {
    cancel()
    setDateRange(range)
  }, [cancel])

  const handleRefresh = useCallback(() => {
    trigger(dateRange, () => fetchData(dateRange))
  }, [trigger, dateRange, fetchData])

  const isRefreshing = refreshStatus === 'triggering' || refreshStatus === 'polling'

  // Three distinct states for the main content area:
  const hasData  = (data?.overview.length ?? 0) > 0
  const isEmpty  = !dataLoading && !dataError && !hasData
  const hasError = !dataLoading && !!dataError

  return (
    <>
      {/* Full-screen overlay only while n8n is running (not during initial data load) */}
      <LoadingOverlay visible={isRefreshing} message={progressMessage} />

      <Header
        dateRange={dateRange}
        onDateChange={handleDateChange}
        lastCollectedAt={data?.lastCollectedAt ?? null}
        refreshStatus={refreshStatus}
        refreshMessage={progressMessage}
        onRefresh={handleRefresh}
        onCancel={cancel}
      />

      <main className="mx-auto max-w-screen-2xl px-6 py-8">
        {/* Source tabs */}
        <div className="mb-8">
          <SourceTabs active={activeSource} onChange={setActiveSource} />
        </div>

        {/* GA4 view */}
        {activeSource === 'ga4' && (
          <div className="space-y-6">

            {/* DB / network error banner */}
            {hasError && (
              <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Failed to load data</p>
                  <p className="mt-0.5 text-red-400/80">{dataError}</p>
                  <button
                    onClick={() => fetchData(dateRange)}
                    className="mt-2 flex items-center gap-1 text-xs text-red-400 underline hover:text-red-300"
                  >
                    <RefreshCw size={11} /> Retry
                  </button>
                </div>
              </div>
            )}

            {/* No data yet — prompt to refresh */}
            {isEmpty && (
              <EmptyState onRefresh={handleRefresh} isRefreshing={isRefreshing} />
            )}

            {/* Charts — shown as soon as data exists, even during a background refresh */}
            {(hasData || dataLoading) && (
              <>
                <KPIGrid
                  rows={data?.overview ?? []}
                  loading={dataLoading}
                />

                <EcommerceSection
                  rows={data?.ecommerce ?? []}
                  loading={dataLoading}
                />

                <SessionsTrendChart
                  rows={data?.overview ?? []}
                  loading={dataLoading}
                />

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                  <div className="lg:col-span-2">
                    <TrafficSourcesChart
                      rows={data?.traffic ?? []}
                      loading={dataLoading}
                    />
                  </div>
                  <div className="lg:col-span-3">
                    <TopPagesTable
                      rows={data?.pages ?? []}
                      loading={dataLoading}
                    />
                  </div>
                </div>

                <DeviceGeoSection
                  rows={data?.deviceGeo ?? []}
                  loading={dataLoading}
                />
              </>
            )}
          </div>
        )}

        {/* Coming soon for other sources */}
        {activeSource !== 'ga4' && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="mb-4 text-4xl">🚧</p>
            <h2 className="text-lg font-semibold text-slate-300">Coming soon</h2>
            <p className="mt-2 text-sm text-slate-500">
              This data source will be added in a future update.
            </p>
          </div>
        )}
      </main>
    </>
  )
}
