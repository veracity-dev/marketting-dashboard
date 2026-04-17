'use client'

import { useEffect, useState, useCallback } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Header }               from './Header'
import { SourceTabs }           from './SourceTabs'
import { PropertySelector }     from './PropertySelector'
import { LoadingOverlay }       from './LoadingOverlay'
import { EmptyState }           from './EmptyState'
import { KPIGrid }              from './ga4/KPIGrid'
import { EcommerceSection }     from './ga4/EcommerceSection'
import { SessionsTrendChart }   from './ga4/SessionsTrendChart'
import { TrafficSourcesChart }  from './ga4/TrafficSourcesChart'
import { TopPagesTable }        from './ga4/TopPagesTable'
import { DeviceGeoSection }     from './ga4/DeviceGeoSection'
import { useGA4Data }           from '@/hooks/useGA4Data'
import { useRefresh }           from '@/hooks/useRefresh'
import { useProperties }        from '@/hooks/useProperties'
import { defaultDateRange }     from '@/lib/utils'
import type { DateRange, DataSource, GAProperty } from '@/lib/types'

const DEFAULT_PROPERTY_ID   = process.env.NEXT_PUBLIC_GA4_PROPERTY_ID   ?? '523852603'
const DEFAULT_PROPERTY_NAME = process.env.NEXT_PUBLIC_GA4_PROPERTY_NAME ?? 'Veracity AI'

export function DashboardShell() {
  const [dateRange,     setDateRange]     = useState<DateRange>(defaultDateRange)
  const [activeSource,  setActiveSource]  = useState<DataSource>('ga4')
  const [selectedProp,  setSelectedProp]  = useState<GAProperty>({
    property_id:  DEFAULT_PROPERTY_ID,
    display_name: DEFAULT_PROPERTY_NAME,
    account_name: '',
    account_id:   '',
    last_synced:  null,
  })

  const { properties, loading: propsLoading, error: propsError, refetch: refetchProps } = useProperties()
  const { data, loading: dataLoading, error: dataError, fetchData }  = useGA4Data()
  const { status: refreshStatus, progressMessage, elapsedSeconds, trigger, cancel } = useRefresh()

  // When properties load, select the first one (or keep default)
  useEffect(() => {
    if (properties.length > 0 && !properties.find((p) => p.property_id === selectedProp.property_id)) {
      setSelectedProp(properties[0])
    }
    // Sync the display_name/last_synced from DB into selectedProp
    const match = properties.find((p) => p.property_id === selectedProp.property_id)
    if (match) setSelectedProp(match)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties])

  // Auto-load data on mount and when property or date range changes
  useEffect(() => {
    fetchData(dateRange, selectedProp.property_id)
  }, [dateRange, selectedProp.property_id, fetchData])

  const handleDateChange = useCallback((range: DateRange) => {
    cancel()
    setDateRange(range)
  }, [cancel])

  const handlePropertySelect = useCallback((prop: GAProperty) => {
    cancel()
    setSelectedProp(prop)
  }, [cancel])

  const handleRefresh = useCallback(() => {
    trigger(dateRange, selectedProp, async () => {
      await refetchProps()
      await fetchData(dateRange, selectedProp.property_id)
    })
  }, [trigger, dateRange, selectedProp, refetchProps, fetchData])

  const isRefreshing  = refreshStatus === 'triggering' || refreshStatus === 'polling'
  const hasData       = (data?.overview.length ?? 0) > 0
  const isEmpty       = !dataLoading && !dataError && !hasData
  const hasError      = !dataLoading && !!dataError

  return (
    <>
      <LoadingOverlay visible={isRefreshing} message={progressMessage} elapsedSeconds={elapsedSeconds} />

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
          <div className="flex gap-6">

            {/* Left: Property selector */}
            <PropertySelector
              properties={properties}
              selected={selectedProp.property_id}
              onSelect={handlePropertySelect}
              loading={propsLoading}
              error={propsError}
              refreshingPropertyId={isRefreshing ? selectedProp.property_id : null}
            />

            {/* Right: Charts */}
            <div className="min-w-0 flex-1 space-y-6">

              {/* DB / network error banner */}
              {hasError && (
                <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Failed to load data</p>
                    <p className="mt-0.5 text-red-400/80">{dataError}</p>
                    <button
                      onClick={() => fetchData(dateRange, selectedProp.property_id)}
                      className="mt-2 flex items-center gap-1 text-xs text-red-400 underline hover:text-red-300"
                    >
                      <RefreshCw size={11} /> Retry
                    </button>
                  </div>
                </div>
              )}

              {/* No data yet */}
              {isEmpty && (
                <EmptyState onRefresh={handleRefresh} isRefreshing={isRefreshing} />
              )}

              {/* Charts — visible as soon as any data exists */}
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
          </div>
        )}

        {/* Coming soon */}
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
