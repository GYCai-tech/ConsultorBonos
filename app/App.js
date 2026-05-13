import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const API_BASE_URL = "http://10.0.0.193:8002";

const ESTADO_CONFIG = {
  0: { label: 'ESPERA',     color: '#fbbf24', bg: 'rgba(251,191,36,0.12)'  },
  1: { label: 'ACTIVO',     color: '#22c55e', bg: 'rgba(34,197,94,0.12)'   },
  2: { label: 'FINALIZADO', color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
};

const MONO = Platform.OS === 'ios' ? 'Courier' : 'monospace';

// ─── Bono Card ────────────────────────────────────────────────────────────────
function BonoCard({ item }) {
  const estado = ESTADO_CONFIG[item.estado_bono] ?? ESTADO_CONFIG[0];

  return (
    <View style={styles.card}>
      {/* Header: orden + bono + badge */}
      <View style={styles.cardHeader}>
        <View style={styles.idGroup}>
          <Text style={styles.idLabel}>ORDEN</Text>
          <Text style={styles.idValue}>#{item.IdOrden}</Text>
        </View>
        <View style={styles.separator} />
        <View style={styles.idGroup}>
          <Text style={styles.idLabel}>BONO</Text>
          <Text style={styles.idValueSub}>{item.IdBono}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <View style={[styles.badge, { backgroundColor: estado.bg, borderColor: estado.color }]}>
          <Text style={[styles.badgeText, { color: estado.color }]}>{estado.label}</Text>
        </View>
      </View>

      {/* Orange accent line */}
      <View style={styles.accentLine} />

      {/* Article */}
      <Text style={styles.fieldLabel}>ARTÍCULO</Text>
      <Text style={styles.fieldValue}>{item.descrip_articulo || '—'}</Text>

      {/* Máquina */}
      <Text style={[styles.fieldLabel, { marginTop: 10 }]}>MÁQUINA</Text>
      <Text style={styles.fieldValue}>
        {item.Matricula ? `[${item.Matricula}]  ` : ''}
        {item.descrip_matricula || '—'}
      </Text>

      {/* Footer strip */}
      <View style={styles.cardFooter}>
        <FooterChip label="ÁREA"    value={item.Area}      />
        <FooterChip label="CLIENTE" value={item.IdCliente} />
        <FooterChip label="USUARIO" value={item.Usuario}   />
      </View>
    </View>
  );
}

function FooterChip({ label, value }) {
  return (
    <View style={styles.footerChip}>
      <Text style={styles.footerLabel}>{label}</Text>
      <Text style={styles.footerValue} numberOfLines={1}>{value || '—'}</Text>
    </View>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [matriculas, setMatriculas]             = useState([]);
  const [selectedMatricula, setSelectedMatricula] = useState(null); // null = Todas
  const [bonos, setBonos]                       = useState([]);
  const [loading, setLoading]                   = useState(false);
  const [refreshing, setRefreshing]             = useState(false);
  const [error, setError]                       = useState(null);
  const [loadingMats, setLoadingMats]           = useState(true);

  useEffect(() => { fetchMatriculas(); }, []);
  useEffect(() => { fetchBonos(); }, [selectedMatricula]);

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
      let url = `${API_BASE_URL}/bonos?estado_bono=0&estado_orden=1`;
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
  }, [selectedMatricula]);

  const onRefresh = useCallback(() => fetchBonos(true), [fetchBonos]);

  // ── Render ──
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>GYC · PRODUCCIÓN</Text>
            <Text style={styles.title}>CONSULTOR{'\n'}DE BONOS</Text>
          </View>
          <TouchableOpacity
            style={[styles.refreshBtn, loading && styles.refreshBtnDisabled]}
            onPress={() => fetchBonos(false)}
            disabled={loading || refreshing}
          >
            {loading
              ? <ActivityIndicator size="small" color="#f97316" />
              : <Text style={styles.refreshIcon}>↺</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Matricula chips */}
        {loadingMats ? (
          <ActivityIndicator color="#f97316" style={{ marginTop: 14 }} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
            contentContainerStyle={styles.chipContainer}
          >
            <MatriculaChip
              label="TODAS"
              active={selectedMatricula === null}
              onPress={() => setSelectedMatricula(null)}
            />
            {matriculas.map((m) => (
              <MatriculaChip
                key={m.Matricula}
                label={m.Matricula}
                sub={m.Descrip?.substring(0, 14)}
                active={selectedMatricula === m.Matricula}
                onPress={() => setSelectedMatricula(m.Matricula)}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* ── Stats bar ── */}
      {!loading && !error && bonos.length > 0 && (
        <View style={styles.statsBar}>
          <Text style={styles.statsText}>
            <Text style={styles.statsCount}>{bonos.length}</Text>
            {' bonos en espera'}
            {selectedMatricula ? ` · máq. ${selectedMatricula}` : ''}
          </Text>
        </View>
      )}

      {/* ── Content ── */}
      {error ? (
        <ErrorState onRetry={() => { fetchMatriculas(); fetchBonos(); }} />
      ) : loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={styles.loadingText}>Cargando bonos...</Text>
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
              tintColor="#f97316"
              colors={['#f97316']}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

// ─── Small components ─────────────────────────────────────────────────────────
function MatriculaChip({ label, sub, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
      {sub && <Text style={[styles.chipSub, active && styles.chipSubActive]}>{sub}</Text>}
    </TouchableOpacity>
  );
}

function ErrorState({ onRetry }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.stateIcon}>⚡</Text>
      <Text style={styles.stateTitle}>Sin Conexión</Text>
      <Text style={styles.stateText}>Sin conexión a la red de empresa</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
        <Text style={styles.retryText}>REINTENTAR</Text>
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
    backgroundColor: '#0f172a',
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'android' ? 44 : 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(249,115,22,0.18)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  eyebrow: {
    fontFamily: MONO,
    fontSize: 10,
    color: '#f97316',
    letterSpacing: 3,
    marginBottom: 5,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: 0.5,
    lineHeight: 34,
  },
  refreshBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(249,115,22,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(249,115,22,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtnDisabled: {
    borderColor: 'rgba(249,115,22,0.15)',
  },
  refreshIcon: {
    fontSize: 24,
    color: '#f97316',
    lineHeight: 28,
  },

  // Chips
  chipScroll: { marginHorizontal: -20 },
  chipContainer: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: 'rgba(100,116,139,0.25)',
    alignItems: 'center',
    minWidth: 56,
  },
  chipActive: {
    backgroundColor: 'rgba(249,115,22,0.15)',
    borderColor: '#f97316',
  },
  chipLabel: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 1,
  },
  chipLabelActive: { color: '#f97316' },
  chipSub: {
    fontFamily: MONO,
    fontSize: 9,
    color: '#334155',
    marginTop: 2,
  },
  chipSubActive: { color: 'rgba(249,115,22,0.6)' },

  // Stats bar
  statsBar: {
    paddingHorizontal: 20,
    paddingVertical: 7,
    backgroundColor: 'rgba(249,115,22,0.06)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(249,115,22,0.08)',
  },
  statsText: {
    fontFamily: MONO,
    fontSize: 12,
    color: '#64748b',
    letterSpacing: 0.8,
  },
  statsCount: {
    color: '#f97316',
    fontWeight: '700',
  },

  // List
  list: {
    padding: 14,
    paddingBottom: 32,
    gap: 10,
  },

  // Card
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(100,116,139,0.18)',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  idGroup: { alignItems: 'center' },
  idLabel: {
    fontFamily: MONO,
    fontSize: 8,
    color: '#475569',
    letterSpacing: 2,
    marginBottom: 2,
  },
  idValue: {
    fontFamily: MONO,
    fontSize: 22,
    fontWeight: '900',
    color: '#f8fafc',
  },
  idValueSub: {
    fontFamily: MONO,
    fontSize: 22,
    fontWeight: '700',
    color: '#94a3b8',
  },
  separator: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(100,116,139,0.2)',
    marginHorizontal: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontFamily: MONO,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  accentLine: {
    height: 2,
    backgroundColor: 'rgba(249,115,22,0.25)',
    borderRadius: 1,
    marginBottom: 12,
  },
  fieldLabel: {
    fontFamily: MONO,
    fontSize: 9,
    color: '#475569',
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 3,
  },
  fieldValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
    letterSpacing: 0.2,
  },

  // Card footer
  cardFooter: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(100,116,139,0.13)',
  },
  footerChip: {
    flex: 1,
    alignItems: 'center',
  },
  footerLabel: {
    fontFamily: MONO,
    fontSize: 8,
    color: '#334155',
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  footerValue: {
    fontFamily: MONO,
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'center',
  },

  // States
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  stateIcon: {
    fontSize: 52,
    marginBottom: 18,
  },
  stateTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  stateText: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 28,
  },
  retryBtn: {
    paddingHorizontal: 30,
    paddingVertical: 14,
    backgroundColor: '#f97316',
    borderRadius: 9,
  },
  retryText: {
    fontFamily: MONO,
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 2,
  },
  loadingText: {
    marginTop: 16,
    fontFamily: MONO,
    color: '#475569',
    fontSize: 13,
    letterSpacing: 1,
  },
});
