import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { clearScans, getRecentScans, SavedScan } from '../services/storage';
import { moderateScale, scale, verticalScale } from '../utils/responsive';

type SortType = 'newest' | 'oldest';

export default function ScanHistoryScreen() {
    const router = useRouter();
    const [scans, setScans] = useState<SavedScan[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortType>('newest');

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        const data = await getRecentScans();
        setScans(data);
        setLoading(false);
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        const data = await getRecentScans();
        setScans(data);
        setRefreshing(false);
    }, []);

    const handleClearAll = () => {
        Alert.alert('Clear History', 'Delete all scan history? This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Clear All', style: 'destructive', onPress: async () => { await clearScans(); setScans([]); } },
        ]);
    };

    const formatDate = (ts: number) => {
        const d = new Date(ts);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return d.toLocaleDateString('en-PH', { weekday: 'short' });
        }
        return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
    };

    const getStatusInfo = (warnings?: string) => {
        if (!warnings || warnings === 'None') return { label: 'Safe', color: '#10B981', bg: '#ECFDF5' };
        const w = warnings.toLowerCase();
        if (w.includes('severe') || w.includes('stop')) return { label: 'Warning', color: '#DC2626', bg: '#FEF2F2' };
        if (w.includes('caution') || w.includes('avoid')) return { label: 'Caution', color: '#F59E0B', bg: '#FFFBEB' };
        return { label: 'Info', color: '#0D9488', bg: '#F0FDFA' };
    };

    const sorted = useMemo(() => {
        let result = scans.filter(scan =>
            scan.analysis.some(m =>
                m.medicineName.toLowerCase().includes(searchQuery.toLowerCase())
            )
        );
        result.sort((a, b) => sortBy === 'newest' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp);
        return result;
    }, [scans, searchQuery, sortBy]);

    // Group by date
    const grouped = useMemo(() => {
        const groups: { label: string; scans: SavedScan[] }[] = [];
        const map = new Map<string, SavedScan[]>();
        const today = new Date(); today.setHours(0, 0, 0, 0);

        sorted.forEach(scan => {
            const d = new Date(scan.timestamp); d.setHours(0, 0, 0, 0);
            const diff = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
            let label = d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
            if (diff === 0) label = 'Today';
            else if (diff === 1) label = 'Yesterday';
            else if (diff < 7) label = 'This Week';

            if (!map.has(label)) { map.set(label, []); groups.push({ label, scans: map.get(label)! }); }
            map.get(label)!.push(scan);
        });
        return groups;
    }, [sorted]);

    return (
        <SafeAreaView style={styles.root}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>Scan History</Text>
                        <Text style={styles.headerSub}>{scans.length} prescription{scans.length !== 1 ? 's' : ''} scanned</Text>
                    </View>
                    {scans.length > 0 && (
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                                onPress={() => setSortBy(sortBy === 'newest' ? 'oldest' : 'newest')}
                                style={styles.headerAction}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="swap-vertical" size={18} color="#0D9488" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleClearAll} style={[styles.headerAction, { backgroundColor: '#FEF2F2' }]} activeOpacity={0.7}>
                                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Search */}
                {scans.length > 0 && (
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={18} color="#94A3B8" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search medicine name..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholderTextColor="#94A3B8"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={18} color="#CBD5E1" />
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>

            <ScrollView
                style={styles.body}
                contentContainerStyle={[styles.bodyContent, sorted.length === 0 && { flex: 1 }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />}
                showsVerticalScrollIndicator={false}
            >
                {loading ? (
                    <View style={styles.emptyState}>
                        <ActivityIndicator size="large" color="#0D9488" />
                        <Text style={styles.emptyTitle}>Loading...</Text>
                    </View>
                ) : scans.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIcon}>
                            <Ionicons name="document-text-outline" size={48} color="#0D9488" />
                        </View>
                        <Text style={styles.emptyTitle}>No Prescriptions Yet</Text>
                        <Text style={styles.emptySub}>Scan your first prescription to start tracking</Text>
                        <TouchableOpacity onPress={() => router.push('/scanner')} activeOpacity={0.85} style={styles.emptyBtn}>
                            <Ionicons name="scan" size={20} color="#FFF" />
                            <Text style={styles.emptyBtnText}>Scan Now</Text>
                        </TouchableOpacity>
                    </View>
                ) : sorted.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="search" size={48} color="#CBD5E1" />
                        <Text style={styles.emptyTitle}>No Results</Text>
                        <Text style={styles.emptySub}>Try a different search term</Text>
                    </View>
                ) : (
                    grouped.map((group, gi) => (
                        <Animated.View key={group.label} entering={FadeInUp.duration(300).delay(gi * 60)}>
                            {/* Date Group Header */}
                            <Text style={styles.dateLabel}>{group.label}</Text>

                            {/* Prescription Card */}
                            <View style={styles.rxCard}>
                                {group.scans.map((scan, si) => {
                                    const meds = scan.analysis;
                                    const isLast = si === group.scans.length - 1;

                                    return (
                                        <TouchableOpacity
                                            key={scan.id}
                                            activeOpacity={0.7}
                                            onPress={() => {
                                                router.push({
                                                    pathname: '/medicine-details',
                                                    params: {
                                                        scanData: JSON.stringify(scan),
                                                        medicineData: JSON.stringify(meds),
                                                    }
                                                });
                                            }}
                                        >
                                            <View style={[styles.rxRow, !isLast && styles.rxRowBorder]}>
                                                {/* Rx Symbol */}
                                                <View style={styles.rxSymbol}>
                                                    <Text style={styles.rxText}>Rx</Text>
                                                </View>

                                                {/* Medicine Info */}
                                                <View style={styles.rxInfo}>
                                                    {meds.map((m, mi) => (
                                                        <View key={mi} style={mi > 0 ? { marginTop: 6 } : undefined}>
                                                            <Text style={styles.rxName} numberOfLines={1}>{m.medicineName}</Text>
                                                            {m.dosage ? (
                                                                <Text style={styles.rxDosage} numberOfLines={1}>{m.dosage}</Text>
                                                            ) : null}
                                                        </View>
                                                    ))}
                                                    {meds.length > 2 && (
                                                        <Text style={styles.rxMore}>+{meds.length - 2} more</Text>
                                                    )}
                                                </View>

                                                {/* Right side: status + time */}
                                                <View style={styles.rxRight}>
                                                    {(() => {
                                                        const status = getStatusInfo(meds[0]?.warnings);
                                                        return (
                                                            <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
                                                                <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                                                                <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
                                                            </View>
                                                        );
                                                    })()}
                                                    <Text style={styles.rxTime}>{formatDate(scan.timestamp)}</Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </Animated.View>
                    ))
                )}

                <View style={{ height: verticalScale(40) }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F8FAFC' },

    // Header
    header: {
        paddingTop: verticalScale(48),
        paddingBottom: verticalScale(12),
        paddingHorizontal: scale(20),
        backgroundColor: '#F8FAFC',
    },
    headerTop: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: verticalScale(14),
    },
    headerTitle: { fontSize: moderateScale(22), fontWeight: '700', color: '#1E293B' },
    headerSub: { fontSize: moderateScale(13), fontWeight: '500', color: '#64748B', marginTop: 2 },
    headerAction: {
        width: scale(38), height: scale(38), borderRadius: 12,
        backgroundColor: '#F0FDFA', alignItems: 'center', justifyContent: 'center',
    },

    // Search
    searchBar: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#FFFFFF', borderRadius: 14,
        paddingHorizontal: scale(14), height: verticalScale(44),
    },
    searchInput: {
        flex: 1, fontSize: moderateScale(14), color: '#1E293B', fontWeight: '500',
    },

    body: { flex: 1 },
    bodyContent: { paddingHorizontal: scale(20), paddingTop: verticalScale(8) },

    // Date Group Label
    dateLabel: {
        fontSize: moderateScale(13), fontWeight: '700', color: '#94A3B8',
        letterSpacing: 0.5, marginTop: verticalScale(12), marginBottom: verticalScale(8),
        marginLeft: scale(4), textTransform: 'uppercase',
    },

    // Prescription Card (groups scans under a single card)
    rxCard: {
        backgroundColor: '#FFFFFF', borderRadius: 18,
        marginBottom: verticalScale(8), overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02, shadowRadius: 8, elevation: 1,
    },

    rxRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: scale(16), paddingVertical: verticalScale(14),
        gap: scale(12),
    },
    rxRowBorder: {
        borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    },

    // Rx symbol
    rxSymbol: {
        width: scale(36), height: scale(36), borderRadius: 10,
        backgroundColor: '#F0FDFA', alignItems: 'center', justifyContent: 'center',
    },
    rxText: {
        fontSize: moderateScale(14), fontWeight: '800', color: '#0D9488',
        fontStyle: 'italic',
    },

    // Medicine info
    rxInfo: { flex: 1 },
    rxName: { fontSize: moderateScale(15), fontWeight: '700', color: '#1E293B' },
    rxDosage: { fontSize: moderateScale(12), fontWeight: '500', color: '#64748B', marginTop: 1 },
    rxMore: { fontSize: moderateScale(12), fontWeight: '600', color: '#0D9488', marginTop: 4 },

    // Right side
    rxRight: { alignItems: 'flex-end', gap: 4 },
    statusPill: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusLabel: { fontSize: moderateScale(11), fontWeight: '700' },
    rxTime: { fontSize: moderateScale(11), fontWeight: '500', color: '#94A3B8' },

    // Empty State
    emptyState: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        gap: 12, paddingBottom: 80,
    },
    emptyIcon: {
        width: 80, height: 80, borderRadius: 22,
        backgroundColor: '#F0FDFA', alignItems: 'center', justifyContent: 'center',
    },
    emptyTitle: { fontSize: moderateScale(18), fontWeight: '700', color: '#1E293B' },
    emptySub: { fontSize: moderateScale(14), color: '#94A3B8', fontWeight: '500', textAlign: 'center', paddingHorizontal: 40 },
    emptyBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#0D9488', paddingHorizontal: scale(24),
        paddingVertical: verticalScale(12), borderRadius: 14, marginTop: 8,
    },
    emptyBtnText: { color: '#FFF', fontWeight: '700', fontSize: moderateScale(15) },
});