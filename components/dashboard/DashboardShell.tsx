'use client'

import { useEffect, useState, useCallback } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Header }               from './Header'
import { SourceTabs }           from './SourceTabs'
import { PropertySelector }     from './PropertySelector'
import { SiteSelector }         from './SiteSelector'
import { LoadingOverlay }       from './LoadingOverlay'
import { EmptyState }           from './EmptyState'
import { KPIGrid }              from './ga4/KPIGrid'
import { EcommerceSection }     from './ga4/EcommerceSection'
import { SessionsTrendChart }   from './ga4/SessionsTrendChart'
import { TrafficSourcesChart }  from './ga4/TrafficSourcesChart'
import { TopPagesTable }        from './ga4/TopPagesTable'
import { DeviceGeoSection }     from './ga4/DeviceGeoSection'
import { GSCKPIGrid }           from './gsc/GSCKPIGrid'
import { GSCTrendChart }        from './gsc/GSCTrendChart'
import { TopQueriesTable }      from './gsc/TopQueriesTable'
import { TopPagesGSCTable }     from './gsc/TopPagesGSCTable'
import { GSCDeviceCountry }     from './gsc/GSCDeviceCountry'
import { useGA4Data }           from '@/hooks/useGA4Data'
import { useRefresh }           from '@/hooks/useRefresh'
import { useProperties }        from '@/hooks/useProperties'
import { useGSCData }           from '@/hooks/useGSCData'
import { useGSCSites }          from '@/hooks/useGSCSites'
import { useGSCRefresh }        from '@/hooks/useGSCRefresh'
import { defaultDateRange }     from '@/lib/utils'
import type { DateRange, DataSource, GAProperty, GSCSite } from '@/lib/types'

const DEFAULT_PROPERTY_ID   = process.env.NEXT_PUBLIC_GA4_PROPERTY_ID   ?? '523852603'
const DEFAULT_PROPERTY_NAME = process.env.NEXT_PUBLIC_GA4_PROPERTY_NAME ?? 'Veracity AI'

export function DashboardShell() {
  const [dateRange,     setDateRange]     = useState<DateRange>(defaultDateRange)
  const [activeSource,  setActiveSource]  = useState<DataSource>('ga4')

  // GA4 state
  const [selectedProp, setSelectedProp] = useState<GAProperty>({
    property_id:  DEFAULT_PROPERTY_ID,
    display_name: DEFAULT_PROPERTY_NAME,
    account_name: '',
    account_id:   '',
    last_synced:  null,
  })
  const { properties, loading: propsLoading, error: propsError, refetch: refetchProps } = useProperties()
  const { data: gaData, loading: gaLoading, error: gaError, fetchData: fetchGA } = useGA4Data()
  const { status: gaRefreshStatus, progressMessage: gaProgressMsg,
          elapsedSeconds: gaElapsed, trigger: gaTrigger, cancel: gaCancel } = useRefresh()

  // GSC state
  const [selectedSite, setSelectedSite] = useState<GSCSite | null>(null)
  const { sites, loading: sitesLoading, refreshing: sitesRefreshing,
          error: sitesError, refetch: refetchSites, refreshFromGSC } = useGSCSites()
  const { data: gscData, loading: gscLoading, error: gscError, fetchData: fetchGSC } = useGSCData()
  const { status: gscRefreshStatus, progressMessage: gscProgressMsg,
          elapsedSeconds: gscElapsed, trigger: gscTrigger, cancel: gscCancel } = useGSCRefresh()

  // GA4: sync display name when properties load
  useEffect(() => {
    if (properties.length > 0 && !properties.find((p) => p.property_id === selectedProp.property_id)) {
      setSelectedProp(properties[0])
    }
    const match = properties.find((p) => p.property_id === selectedProp.property_id)
    if (match) setSelectedProp(match)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties])

  // GSC: pick first site on load
  useEffect(() => {
    if (sites.length > 0 && !selectedSite) {
      setSelectedSite(sites[0])
    }
    if (selectedSite) {
      const match = sites.find((s) => s.site_url === selectedSite.site_url)
      if (match) setSelectedSite(match)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sites])

  // Auto-load GA4 data
  useEffect(() => {
    if (activeSource === 'ga4') fetchGA(dateRange, selectedProp.property_id)
  }, [dateRange, selectedProp.property_id, fetchGA, activeSource])

  // Auto-load GSC data
  useEffect(() => {
    if (activeSource === 'gsc' && selectedSite) {
      fetchGSC(dateRange, selectedSite.site_url)
    }
  }, [dateRange, selectedSite, fetchGSC, activeSource])

  const handleDateChange = useCallback((range: DateRange) => {
    gaCancel(); gscCancel()
    setDateRange(range)
  }, [gaCancel, gscCancel])

  const handlePropertySelect = useCallback((prop: GAProperty) => {
    gaCancel()
    setSelectedProp(prop)
  }, [gaCancel])

  const handleSiteSelect = useCallback((site: GSCSite) => {
    gscCancel()
    setSelectedSite(site)
  }, [gscCancel])

  const handleRefresh = useCallback(() => {
    if (activeSource === 'ga4') {
      gaTrigger(dateRange, selectedProp, async () => {
        await refetchProps()
        await fetchGA(dateRange, selectedProp.property_id)
      })
    } else if (activeSource === 'gsc' && selectedSite) {
      gscTrigger(dateRange, selectedSite, async () => {
        await refetchSites()
        await fetchGSC(dateRange, selectedSite.site_url)
      })
    }
  }, [activeSource, gaTrigger, gscTrigger, dateRange, selectedProp, selectedSite,
      refetchProps, refetchSites, fetchGA, fetchGSC])

  // Unified refresh-state for header / overlay (whichever source is active)
  const activeStatus  = activeSource === 'ga4' ? gaRefreshStatus  : gscRefreshStatus
  const activeMessage = activeSource === 'ga4' ? gaProgressMsg    : gscProgressMsg
  const activeElapsed = activeSource === 'ga4' ? gaElapsed        : gscElapsed
  const activeCancel  = activeSource === 'ga4' ? gaCancel         : gscCancel
  const isRefreshing  = activeStatus === 'triggering' || activeStatus === 'polling'

  const hasGAData     = (gaData?.overview.length ?? 0) > 0
  const isGAEmpty     = !gaLoading  && !gaError  && !hasGAData
  const hasGAError    = !gaLoading  && !!gaError

  const hasGSCData    = (gscData?.overview.length ?? 0) > 0
  const isGSCEmpty    = !gscLoading && !gscError && !hasGSCData
  const hasGSCError   = !gscLoading && !!gscError

  const lastCollectedAt =
    activeSource === 'ga4' ? gaData?.lastCollectedAt ?? null
                           : gscData?.lastCollectedAt ?? null

  return (
    <>
      <LoadingOverlay visible={isRefreshing} message={activeMessage} elapsedSeconds={activeElapsed} />

      <Header
        dateRange={dateRange}
        onDateChange={handleDateChange}
        lastCollectedAt={lastCollectedAt}
        refreshStatus={activeStatus}
        refreshMessage={activeMessage}
        onRefresh={handleRefresh}
        onCancel={activeCancel}
      />

      <main className="mx-auto max-w-screen-2xl px-6 py-8">
        <div className="mb-8">
          <SourceTabs active={activeSource} onChange={setActiveSource} />
        </div>

        {/* ────────────── GA4 view ────────────── */}
        {activeSource === 'ga4' && (
          <div className="flex gap-6">
            <PropertySelector
              properties={properties}
              selected={selectedProp.property_id}
              onSelect={handlePropertySelect}
              loading={propsLoading}
              error={propsError}
              refreshingPropertyId={isRefreshing ? selectedProp.property_id : null}
            />

            <div className="min-w-0 flex-1 space-y-6">
              {hasGAError && (
                <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Failed to load data</p>
                    <p className="mt-0.5 text-red-400/80">{gaError}</p>
                    <button
                      onClick={() => fetchGA(dateRange, selectedProp.property_id)}
                      className="mt-2 flex items-center gap-1 text-xs text-red-400 underline hover:text-red-300"
                    >
                      <RefreshCw size={11} /> Retry
                    </button>
                  </div>
                </div>
              )}

              {isGAEmpty && <EmptyState onRefresh={handleRefresh} isRefreshing={isRefreshing} />}

              {(hasGAData || gaLoading) && (
                <>
                  <KPIGrid            rows={gaData?.overview  ?? []} loading={gaLoading} />
                  <EcommerceSection   rows={gaData?.ecommerce ?? []} loading={gaLoading} />
                  <SessionsTrendChart rows={gaData?.overview  ?? []} loading={gaLoading} />
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                    <div className="lg:col-span-2">
                      <TrafficSourcesChart rows={gaData?.traffic ?? []} loading={gaLoading} />
                    </div>
                    <div className="lg:col-span-3">
                      <TopPagesTable rows={gaData?.pages ?? []} loading={gaLoading} />
                    </div>
                  </div>
                  <DeviceGeoSection rows={gaData?.deviceGeo ?? []} loading={gaLoading} />
                </>
              )}
            </div>
          </div>
        )}

        {/* ────────────── GSC view ────────────── */}
        {activeSource === 'gsc' && (
          <div className="flex gap-6">
            <SiteSelector
              sites={sites}
              selected={selectedSite?.site_url ?? null}
              onSelect={handleSiteSelect}
              loading={sitesLoading}
              refreshing={sitesRefreshing}
              error={sitesError}
              onRefreshList={refreshFromGSC}
              refreshingSiteUrl={isRefreshing ? selectedSite?.site_url ?? null : null}
            />

            <div className="min-w-0 flex-1 space-y-6">
              {hasGSCError && (
                <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Failed to load data</p>
                    <p className="mt-0.5 text-red-400/80">{gscError}</p>
                    {selectedSite && (
                      <button
                        onClick={() => fetchGSC(dateRange, selectedSite.site_url)}
                        className="mt-2 flex items-center gap-1 text-xs text-red-400 underline hover:text-red-300"
                      >
                        <RefreshCw size={11} /> Retry
                      </button>
                    )}
                  </div>
                </div>
              )}

              {!selectedSite && !sitesLoading && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 p-12 text-center">
                  <p className="mb-2 text-3xl">🔍</p>
                  <h2 className="text-sm font-semibold text-slate-300">No site selected</h2>
                  <p className="mt-2 text-xs text-slate-500">
                    Click <span className="text-slate-400">Sync</span> in the sidebar to load your verified Search Console sites.
                  </p>
                </div>
              )}

              {selectedSite && isGSCEmpty && (
                <EmptyState onRefresh={handleRefresh} isRefreshing={isRefreshing} />
              )}

              {selectedSite && (hasGSCData || gscLoading) && (
                <>
                  <GSCKPIGrid     rows={gscData?.overview ?? []} loading={gscLoading} />
                  <GSCTrendChart  rows={gscData?.overview ?? []} loading={gscLoading} />
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <TopQueriesTable   rows={gscData?.queries ?? []} loading={gscLoading} />
                    <TopPagesGSCTable  rows={gscData?.pages   ?? []} loading={gscLoading} />
                  </div>
                  <GSCDeviceCountry
                    devices={gscData?.devices   ?? []}
                    countries={gscData?.countries ?? []}
                    loading={gscLoading}
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* Coming soon */}
        {activeSource !== 'ga4' && activeSource !== 'gsc' && (
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
