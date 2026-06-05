import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const API_BASE_URL = "http://10.0.0.12:8002";

const ESTADO_CONFIG = {
  0: { label: 'En espera',  color: '#d97706', bg: '#fef3c7', dot: '#f59e0b' },
  1: { label: 'Activo',     color: '#059669', bg: '#d1fae5', dot: '#10b981' },
  2: { label: 'Finalizado', color: '#6b7280', bg: '#f3f4f6', dot: '#9ca3af' },
  3: { label: 'Bloqueado',  color: '#dc2626', bg: '#fee2e2', dot: '#ef4444' },
};

const TABS = [
  { key: 'espera',    label: 'En espera',  estadoBono: '0' },
  { key: 'bloqueado', label: 'Bloqueadas', estadoBono: '3' },
  { key: 'todas',     label: 'Todas',      estadoBono: null },
];

// ─── Dropdown ─────────────────────────────────────────────────────────────────
function MaquinaDropdown({ matriculas, selected, onSelect, loading }) {
  const [open, setOpen] = useState(false);

  const selectedItem = matriculas.find(m => m.Matricula === selected);
  const displayLabel = selected
    ? (selectedItem?.Descrip || selected)
    : 'Todas las máquinas';

  return (
    <>
      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => !loading && setOpen(true)}
        activeOpacity={0.75}
      >
        <View style={styles.dropdownInner}>
          <Text style={styles.dropdownLabel}>MÁQUINA</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#f97316" />
          ) : (
            <Text style={styles.dropdownValue} numberOfLines={1}>
              {displayLabel}
            </Text>
          )}
        </View>
        <Text style={[styles.dropdownArrow, open && styles.dropdownArrowOpen]}>
          ▾
        </Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Seleccionar máquina</Text>

            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
              <DropdownOption
                label="Todas las máquinas"
                active={selected === null}
                onPress={() => { onSelect(null); setOpen(false); }}
              />
              {matriculas.map((m) => (
                <DropdownOption
                  key={m.Matricula}
                  label={m.Descrip || m.Matricula}
                  sub={m.Matricula}
                  active={selected === m.Matricula}
                  onPress={() => { onSelect(m.Matricula); setOpen(false); }}
                />
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function DropdownOption({ label, sub, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.option, active && styles.optionActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.optionLeft}>
        {active && <View style={styles.optionDot} />}
        <View>
          <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
            {label}
          </Text>
          {sub && (
            <Text style={styles.optionSub}>{sub}</Text>
          )}
        </View>
      </View>
      {active && <Text style={styles.optionCheck}>✓</Text>}
    </TouchableOpacity>
  );
}

// ─── Bono Card ────────────────────────────────────────────────────────────────
function BonoCard({ item }) {
  const estado = ESTADO_CONFIG[item.estado_bono] ?? ESTADO_CONFIG[0];

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardIds}>
          <Text style={styles.ordenLabel}>Orden</Text>
          <Text style={styles.ordenValue}>#{item.IdOrden}</Text>
        </View>
        <View style={styles.cardDivider} />
        <View style={styles.cardIds}>
          <Text style={styles.ordenLabel}>Bono</Text>
          <Text style={[styles.ordenValue, styles.bonoValue]}>{item.IdBono}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <View style={[styles.badge, { backgroundColor: estado.bg }]}>
          <View style={[styles.badgeDot, { backgroundColor: estado.dot }]} />
          <Text style={[styles.badgeText, { color: estado.color }]}>
            {estado.label}
          </Text>
        </View>
      </View>

      <View style={styles.dividerH} />

      <Text style={styles.fieldLabel}>Artículo</Text>
      <Text style={styles.fieldValue}>{item.descrip_articulo || '—'}</Text>

      <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Máquina</Text>
      <Text style={styles.fieldValue}>
        {item.descrip_matricula || item.Matricula || '—'}
      </Text>
      {item.Matricula && item.descrip_matricula && (
        <Text style={styles.fieldSub}>{item.Matricula}</Text>
      )}

      <View style={styles.cardFooter}>
        <Chip icon="📍" value={item.Area} />
        <Chip icon="🏢" value={item.IdCliente} />
        <Chip icon="👤" value={item.Usuario} />
      </View>
    </View>
  );
}

function Chip({ icon, value }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipIcon}>{icon}</Text>
      <Text style={styles.chipText} numberOfLines={1}>{value || '—'}</Text>
    </View>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [matriculas, setMatriculas]               = useState([]);
  const [selectedMatricula, setSelectedMatricula] = useState(null);
  const [activeTab, setActiveTab]                 = useState('espera');
  const [bonos, setBonos]                         = useState([]);
  const [loading, setLoading]                     = useState(false);
  const [refreshing, setRefreshing]               = useState(false);
  const [error, setError]                         = useState(null);
  const [loadingMats, setLoadingMats]             = useState(true);

  useEffect(() => { fetchMatriculas(); }, []);
  useEffect(() => { fetchBonos(); }, [selectedMatricula, activeTab]);

  const fetchMatriculas = async () => {
    setLoadingMats(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/matriculas`);
      if (!resp.ok) throw new Error();
      const data = await resp.json();
      setMatriculas(data.matriculas);
      setError(null);
    } catch {
      setError('Sin conexión a la red de empresa');
    } finally {
      setLoadingMats(false);
    }
  };

  const fetchBonos = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const tab = TABS.find(t => t.key === activeTab);
      let url = `${API_BASE_URL}/bonos?estado_orden=1`;
      if (tab?.estadoBono !== null) url += `&estado_bono=${tab.estadoBono}`;
      if (selectedMatricula) url += `&matricula=${encodeURIComponent(selectedMatricula)}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error();
      const data = await resp.json();
      setBonos(data.bonos);
    } catch {
      setError('Sin conexión a la red de empresa');
      setBonos([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedMatricula, activeTab]);

  const onRefresh = useCallback(() => fetchBonos(true), [fetchBonos]);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerEyebrow}>GYC · PRODUCCIÓN</Text>
            <Text style={styles.headerTitle}>Consultor de Bonos</Text>
          </View>
          <TouchableOpacity
            style={[styles.refreshBtn, (loading || refreshing) && styles.refreshBtnActive]}
            onPress={() => fetchBonos(false)}
            disabled={loading || refreshing}
          >
            {loading
              ? <ActivityIndicator size="small" color="#f97316" />
              : <Text style={styles.refreshIcon}>↺</Text>
            }
          </TouchableOpacity>
        </View>

        <MaquinaDropdown
          matriculas={matriculas}
          selected={selectedMatricula}
          onSelect={setSelectedMatricula}
          loading={loadingMats}
        />

        <View style={styles.tabs}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Stats ── */}
      {!loading && !error && bonos.length > 0 && (
        <View style={styles.statsBar}>
          <View style={styles.statsDot} />
          <Text style={styles.statsText}>
            <Text style={styles.statsCount}>{bonos.length}</Text>
            {` ${bonos.length === 1 ? 'bono' : 'bonos'} · ${TABS.find(t => t.key === activeTab)?.label}`}
            {selectedMatricula ? ` · ${matriculas.find(m => m.Matricula === selectedMatricula)?.Descrip || selectedMatricula}` : ''}
          </Text>
        </View>
      )}

      {/* ── Content ── */}
      {error ? (
        <ErrorState onRetry={() => { fetchMatriculas(); fetchBonos(); }} />
      ) : loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={styles.loadingText}>Cargando bonos…</Text>
        </View>
      ) : bonos.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={bonos}
          renderItem={({ item }) => <BonoCard item={item} />}
          keyExtractor={(item) => `${item.IdOrden}-${item.IdBono}`}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#f97316']}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

function ErrorState({ onRetry }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.stateIcon}>⚡</Text>
      <Text style={styles.stateTitle}>Sin conexión</Text>
      <Text style={styles.stateText}>No se puede alcanzar la red de empresa</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
        <Text style={styles.retryText}>Reintentar</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.centered}>
      <Text style={styles.stateIcon}>✓</Text>
      <Text style={styles.stateTitle}>Todo al día</Text>
      <Text style={styles.stateText}>No hay bonos en espera para la selección actual</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'android' ? 44 : 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerEyebrow: {
    fontSize: 11,
    color: '#f97316',
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  refreshBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#fff7ed',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtnActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#f97316',
  },
  refreshIcon: {
    fontSize: 22,
    color: '#f97316',
    lineHeight: 26,
  },

  // Dropdown
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownInner: {
    flex: 1,
  },
  dropdownLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  dropdownValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  dropdownArrow: {
    fontSize: 18,
    color: '#94a3b8',
    marginLeft: 8,
  },
  dropdownArrowOpen: {
    transform: [{ rotate: '180deg' }],
  },

  // Modal / Sheet
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '70%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  optionActive: {
    backgroundColor: '#fff7ed',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  optionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f97316',
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
  },
  optionLabelActive: {
    fontWeight: '700',
    color: '#f97316',
  },
  optionSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  optionCheck: {
    fontSize: 16,
    color: '#f97316',
    fontWeight: '700',
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 6,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#f97316',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#f97316',
  },

  // Stats
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  statsDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f97316',
  },
  statsText: {
    fontSize: 13,
    color: '#64748b',
  },
  statsCount: {
    fontWeight: '700',
    color: '#f97316',
  },

  // List
  list: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },

  // Card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  cardIds: { alignItems: 'center' },
  ordenLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  ordenValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  bonoValue: {
    color: '#64748b',
    fontWeight: '600',
  },
  cardDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e2e8f0',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dividerH: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: 21,
  },
  fieldSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },

  // Footer chips
  cardFooter: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipIcon: {
    fontSize: 11,
  },
  chipText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    flex: 1,
  },

  // States
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  stateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  stateTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  stateText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  retryBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    backgroundColor: '#f97316',
    borderRadius: 10,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 13,
    color: '#94a3b8',
  },
});
