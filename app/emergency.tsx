import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Linking,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as AppTheme from '../constants/Colors';
import {
    requestSpeechPermission,
    speakText,
    startListening,
    stopListening,
    useSpeechRecognitionEvent,
} from '../services/speechService';

const Colors: any = (AppTheme as any).Colors ?? (AppTheme as any);
const Shadows: any = (AppTheme as any).Shadows ?? {};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const CONTACTS_KEY = 'emergency_contacts';
const MEDICAL_ID_KEY = 'medical_id';
const DISTRESS_KEYWORDS = ['help', 'emergency', 'call 911', 'accident', 'hurt', 'pain', 'ambulance'];

interface EmergencyContact { id: string; name: string; phone: string; }
interface MedicalInfo { name: string; bloodType: string; allergies: string; conditions: string; medications: string; }

const DISASTER_TYPES = [
    { icon: 'thunderstorm-outline', label: 'Typhoon', color: '#3B82F6', bg: '#EFF6FF' },
    { icon: 'water-outline', label: 'Flood', color: '#0EA5E9', bg: '#F0F9FF' },
    { icon: 'earth-outline', label: 'Earthquake', color: '#92400E', bg: '#FFFBEB' },
    { icon: 'flame-outline', label: 'Fire', color: Colors.error, bg: Colors.errorBg },
];

export default function Emergency() {
    const router = useRouter();
    const [contacts, setContacts] = useState<EmergencyContact[]>([]);
    const [medicalInfo, setMedicalInfo] = useState<MedicalInfo>({ name: '', bloodType: '', allergies: '', conditions: '', medications: '' });
    const [isEditingMedical, setIsEditingMedical] = useState(false);
    const [isAddingContact, setIsAddingContact] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [sosCountdown, setSosCountdown] = useState<number | null>(null);
    const [isSmsAvailable, setIsSmsAvailable] = useState(false);
    const [isSirenActive, setIsSirenActive] = useState(false);
    const [activeDisaster, setActiveDisaster] = useState<string | null>(null);

    const RNAnimated = require('react-native').Animated;
    const pulseAnim = useRef(new RNAnimated.Value(1)).current;
    const sirenAnim = useRef(new RNAnimated.Value(1)).current;
    const countdownTimerRef = useRef<any>(null);

    const sosPulse = useSharedValue(1);
    useEffect(() => {
        sosPulse.value = withRepeat(
            withSequence(withTiming(1.06, { duration: 800 }), withTiming(1, { duration: 800 })),
            -1, true
        );
    }, []);
    const sosPulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: sosPulse.value }] }));

    const glowOpacity = useSharedValue(0.2);
    useEffect(() => {
        glowOpacity.value = withRepeat(
            withSequence(withTiming(0.5, { duration: 1100 }), withTiming(0.2, { duration: 1100 })),
            -1, true
        );
    }, []);
    const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));

    useEffect(() => {
        loadData(); checkSmsAvailability(); checkPermissions();
        return () => { stopAutoDetection(); stopSiren(); if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current); };
    }, []);

    const checkPermissions = async () => { await Location.requestForegroundPermissionsAsync(); await requestSpeechPermission(); };

    useEffect(() => {
        if (isListening) {
            RNAnimated.loop(RNAnimated.sequence([
                RNAnimated.timing(pulseAnim, { toValue: 1.25, duration: 750, useNativeDriver: true }),
                RNAnimated.timing(pulseAnim, { toValue: 1, duration: 750, useNativeDriver: true }),
            ])).start();
        } else { pulseAnim.setValue(1); }
    }, [isListening]);

    useEffect(() => {
        if (isSirenActive) {
            RNAnimated.loop(RNAnimated.sequence([
                RNAnimated.timing(sirenAnim, { toValue: 1.1, duration: 300, useNativeDriver: true }),
                RNAnimated.timing(sirenAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            ])).start();
            playSirenLoop();
        } else { sirenAnim.setValue(1); Speech.stop(); }
    }, [isSirenActive]);

    const playSirenLoop = () => {
        if (!isSirenActive) return;
        Speech.speak('EMERGENCY! HELP NEEDED!', { rate: 1.1, pitch: 1.1, volume: 1.0, onDone: () => { if (isSirenActive) playSirenLoop(); } });
    };
    const stopSiren = () => { setIsSirenActive(false); Speech.stop(); };
    const checkSmsAvailability = async () => { try { const SMS = require('expo-sms'); setIsSmsAvailable(await SMS.isAvailableAsync()); } catch { setIsSmsAvailable(false); } };

    const loadData = async () => {
        try {
            const c = await AsyncStorage.getItem(CONTACTS_KEY); if (c) setContacts(JSON.parse(c));
            const m = await AsyncStorage.getItem(MEDICAL_ID_KEY); if (m) setMedicalInfo(JSON.parse(m));
        } catch (e) { console.error(e); }
    };
    const saveContacts = async (list: EmergencyContact[]) => { await AsyncStorage.setItem(CONTACTS_KEY, JSON.stringify(list)); setContacts(list); };
    const saveMedicalInfo = async () => {
        try { await AsyncStorage.setItem(MEDICAL_ID_KEY, JSON.stringify(medicalInfo)); setIsEditingMedical(false); Alert.alert('Saved', 'Medical ID updated.'); }
        catch { Alert.alert('Error', 'Could not save Medical ID.'); }
    };

    useSpeechRecognitionEvent('start', () => setIsListening(true));
    useSpeechRecognitionEvent('end', () => setIsListening(false));
    useSpeechRecognitionEvent('result', (event) => {
        if (sosCountdown !== null) return;
        const t = event.results[0]?.transcript.toLowerCase() || '';
        if (DISTRESS_KEYWORDS.find(k => t.includes(k))) startSOSCountdown();
    });
    useSpeechRecognitionEvent('error', (event) => {
        setIsListening(false);
        if (event.error === 'not-allowed') Alert.alert('Permission Denied', 'Microphone access needed.');
        else if (event.error !== 'no-speech') Alert.alert('Speech Error', `${event.error}: ${event.message || ''}`);
    });

    const toggleAutoDetection = async () => { if (isListening) await stopAutoDetection(); else await startAutoDetection(); };
    const startAutoDetection = async () => { try { await startListening(); speakText('Emergency listening active.'); } catch { setIsListening(false); Alert.alert('Error', 'Could not start.'); } };
    const stopAutoDetection = async () => { try { await stopListening(); } catch { } setIsListening(false); };

    const startSOSCountdown = () => {
        if (sosCountdown !== null) return;
        stopAutoDetection(); setSosCountdown(10); speakText('Emergency detected. Calling 911 in 10 seconds.');
        let t = 10;
        countdownTimerRef.current = setInterval(() => {
            t -= 1; setSosCountdown(t);
            if (t <= 0) { clearInterval(countdownTimerRef.current); setSosCountdown(null); executeSOS(); }
        }, 1000);
    };
    const cancelSOS = () => { if (countdownTimerRef.current) clearInterval(countdownTimerRef.current); setSosCountdown(null); speakText('Cancelled.'); };

    const executeSOS = async () => {
        let locationLink = '';
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') { const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }); locationLink = ` https://maps.google.com/?q=${loc.coords.latitude},${loc.coords.longitude}`; }
        } catch { }
        if (contacts.length > 0 && isSmsAvailable) {
            try { const SMS = require('expo-sms'); SMS.sendSMSAsync(contacts.map(c => c.phone), `🆘 EMERGENCY: I need help! Automated alert from MediMate.${locationLink}`).catch(console.error); } catch { }
        }
        setTimeout(() => Linking.openURL('tel:911'), 500);
    };

    const addContact = () => {
        if (!newName.trim() || !newPhone.trim()) { Alert.alert('Missing Info', 'Please enter both name and phone number.'); return; }
        saveContacts([...contacts, { id: Date.now().toString(), name: newName.trim(), phone: newPhone.trim() }]);
        setNewName(''); setNewPhone(''); setIsAddingContact(false);
    };
    const deleteContact = (id: string) => {
        Alert.alert('Remove Contact?', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => saveContacts(contacts.filter(c => c.id !== id)) },
        ]);
    };

    const openEvacuationMap = () => Linking.openURL('https://www.google.com/maps/search/evacuation+center+near+me+Philippines');
    const openDisasterInfo = (type: string) => {
        const urls: Record<string, string> = {
            Typhoon: 'https://bagong.pagasa.dost.gov.ph',
            Flood: 'https://ndrrmc.gov.ph',
            Earthquake: 'https://phivolcs.dost.gov.ph',
            Fire: 'https://www.bfp.gov.ph',
        };
        Linking.openURL(urls[type] || 'https://ndrrmc.gov.ph');
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

            {/* ── Countdown Overlay ── */}
            {sosCountdown !== null && (
                <Animated.View entering={FadeIn.duration(200)} style={styles.countdownOverlay}>
                    <View style={styles.countdownIconWrap}>
                        <Ionicons name="warning" size={44} color={Colors.white} />
                    </View>
                    <Text style={styles.countdownTitle}>EMERGENCY DETECTED</Text>
                    <Text style={styles.countdownSub}>Calling 911 in</Text>
                    <Text style={styles.countdownNumber}>{sosCountdown}</Text>
                    <TouchableOpacity style={styles.cancelButton} onPress={cancelSOS} activeOpacity={0.85}>
                        <Ionicons name="close-circle" size={20} color={Colors.error} />
                        <Text style={styles.cancelButtonText}>CANCEL</Text>
                    </TouchableOpacity>
                </Animated.View>
            )}

            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={22} color={Colors.error} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Emergency</Text>
                    <Text style={styles.headerSub}>Tools, contacts & disaster info</Text>
                </View>
                <View style={styles.alertBadge}>
                    <Ionicons name="shield-checkmark" size={14} color={Colors.error} />
                    <Text style={styles.alertBadgeText}>READY</Text>
                </View>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* ── SOS Button ── */}
                <Animated.View entering={FadeInUp.duration(500).delay(80)} style={styles.sosSection}>
                    <Text style={styles.sosHint}>TAP FOR IMMEDIATE HELP</Text>
                    <View style={styles.glowWrap}>
                        <Animated.View style={[styles.glowRing, glowStyle]} />
                        <AnimatedTouchable
                            style={[styles.sosButton, sosPulseStyle]}
                            onPress={() => Linking.openURL('tel:911')}
                            activeOpacity={0.88}
                        >
                            <Ionicons name="call" size={28} color={Colors.white} style={{ marginBottom: 4 }} />
                            <Text style={styles.sosText}>SOS</Text>
                            <Text style={styles.sosSub}>CALL 911</Text>
                        </AnimatedTouchable>
                    </View>
                    <Text style={styles.sosCaption}>
                        Tap to call PH Emergency Hotline <Text style={{ fontWeight: '800', color: Colors.textPrimary }}>911</Text>
                    </Text>
                    {/* NDRRMC Hotline */}
                    <TouchableOpacity style={styles.ndrrmcBtn} onPress={() => Linking.openURL('tel:8888')} activeOpacity={0.85}>
                        <Ionicons name="shield-half" size={16} color={Colors.error} />
                        <Text style={styles.ndrrmcBtnText}>NDRRMC Hotline: <Text style={{ color: Colors.error }}>8888</Text></Text>
                    </TouchableOpacity>
                </Animated.View>

                {/* ── Quick Tools ── */}
                <Animated.View entering={FadeInUp.duration(500).delay(160)} style={styles.quickRow}>
                    <TouchableOpacity style={[styles.quickCard, isListening && styles.qActive]} onPress={toggleAutoDetection} activeOpacity={0.82}>
                        <RNAnimated.View style={{ transform: [{ scale: pulseAnim }] }}>
                            <View style={[styles.qIcon, isListening && styles.qIconActive]}>
                                <Ionicons name={isListening ? 'mic' : 'mic-off-outline'} size={22} color={isListening ? Colors.white : Colors.error} />
                            </View>
                        </RNAnimated.View>
                        <Text style={[styles.qLabel, isListening && { color: Colors.error }]}>Auto-SOS</Text>
                        <Text style={styles.qSub}>{isListening ? 'Listening...' : 'Voice detect'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.quickCard, isSirenActive && styles.qSirenActive]} onPress={() => setIsSirenActive(!isSirenActive)} activeOpacity={0.82}>
                        <RNAnimated.View style={{ transform: [{ scale: sirenAnim }] }}>
                            <View style={[styles.qIcon, isSirenActive && styles.qIconSiren]}>
                                <Ionicons name="megaphone" size={22} color={isSirenActive ? Colors.white : Colors.error} />
                            </View>
                        </RNAnimated.View>
                        <Text style={[styles.qLabel, isSirenActive && { color: Colors.error }]}>Siren</Text>
                        <Text style={styles.qSub}>{isSirenActive ? 'ACTIVE' : 'Tap to play'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.quickCard} onPress={openEvacuationMap} activeOpacity={0.82}>
                        <View style={styles.qIcon}>
                            <Ionicons name="navigate-outline" size={22} color={Colors.error} />
                        </View>
                        <Text style={styles.qLabel}>Shelters</Text>
                        <Text style={styles.qSub}>Find nearby</Text>
                    </TouchableOpacity>
                </Animated.View>

                {/* ── Disaster Evacuation ── */}
                <Animated.View entering={FadeInUp.duration(500).delay(240)} style={styles.card}>
                    <View style={styles.cardHead}>
                        <View style={styles.cardTitleRow}>
                            <View style={[styles.cardIcon, { backgroundColor: Colors.errorBg }]}>
                                <Ionicons name="warning-outline" size={17} color={Colors.error} />
                            </View>
                            <Text style={styles.cardTitle}>Disaster Evacuation</Text>
                        </View>
                    </View>

                    {/* Disaster type buttons */}
                    <View style={styles.disasterGrid}>
                        {DISASTER_TYPES.map((d) => (
                            <TouchableOpacity
                                key={d.label}
                                style={[styles.disasterBtn, activeDisaster === d.label && { borderColor: d.color, borderWidth: 2 }]}
                                onPress={() => { setActiveDisaster(d.label === activeDisaster ? null : d.label); openDisasterInfo(d.label); }}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.disasterIcon, { backgroundColor: d.bg }]}>
                                    <Ionicons name={d.icon as any} size={24} color={d.color} />
                                </View>
                                <Text style={styles.disasterLabel}>{d.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Evacuation actions */}
                    <TouchableOpacity style={styles.evacuateBtn} onPress={openEvacuationMap} activeOpacity={0.85}>
                        <Ionicons name="map-outline" size={18} color={Colors.white} />
                        <Text style={styles.evacuateBtnText}>Find Evacuation Shelters</Text>
                        <Ionicons name="chevron-forward" size={16} color={Colors.white} />
                    </TouchableOpacity>

                    <View style={styles.checklistBox}>
                        <Text style={styles.checklistTitle}>⚡ Quick Evacuation Checklist</Text>
                        {[
                            'Grab medications & medical ID',
                            'Take important documents',
                            'Bring phone charger & water',
                            'Tell someone your route',
                            'Follow official evacuation signs',
                        ].map((item, i) => (
                            <View key={i} style={styles.checkItem}>
                                <View style={styles.checkDot} />
                                <Text style={styles.checkText}>{item}</Text>
                            </View>
                        ))}
                    </View>
                </Animated.View>

                {/* ── Medical ID ── */}
                <Animated.View entering={FadeInUp.duration(500).delay(320)} style={styles.card}>
                    <View style={styles.cardHead}>
                        <View style={styles.cardTitleRow}>
                            <View style={[styles.cardIcon, { backgroundColor: Colors.errorBg }]}>
                                <Ionicons name="medical" size={17} color={Colors.error} />
                            </View>
                            <Text style={styles.cardTitle}>Medical ID</Text>
                        </View>
                        <TouchableOpacity style={styles.editPill} onPress={isEditingMedical ? saveMedicalInfo : () => setIsEditingMedical(true)}>
                            <Ionicons name={isEditingMedical ? 'checkmark' : 'create-outline'} size={13} color={Colors.error} />
                            <Text style={styles.editPillText}>{isEditingMedical ? 'Save' : 'Edit'}</Text>
                        </TouchableOpacity>
                    </View>

                    {isEditingMedical ? (
                        <View style={styles.formStack}>
                            {[{ ph: 'Full Name', key: 'name' }, { ph: 'Blood Type (e.g. A+)', key: 'bloodType' }, { ph: 'Allergies', key: 'allergies' }, { ph: 'Medical Conditions', key: 'conditions' }].map(f => (
                                <TextInput key={f.key} style={styles.input} placeholder={f.ph} placeholderTextColor={Colors.textTertiary}
                                    value={(medicalInfo as any)[f.key]} onChangeText={t => setMedicalInfo({ ...medicalInfo, [f.key]: t })} />
                            ))}
                            <TextInput style={[styles.input, { height: 76, textAlignVertical: 'top' }]} placeholder="Medications / Notes" placeholderTextColor={Colors.textTertiary}
                                multiline value={medicalInfo.medications} onChangeText={t => setMedicalInfo({ ...medicalInfo, medications: t })} />
                        </View>
                    ) : (
                        <View>
                            {[
                                { icon: 'person-outline', label: 'Name', value: medicalInfo.name },
                                { icon: 'water-outline', label: 'Blood Type', value: medicalInfo.bloodType, red: true },
                                { icon: 'alert-circle-outline', label: 'Allergies', value: medicalInfo.allergies || 'None' },
                                { icon: 'fitness-outline', label: 'Conditions', value: medicalInfo.conditions || 'None' },
                            ].map((r, i, arr) => (
                                <View key={r.label} style={[styles.medRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                                    <View style={styles.medLeft}>
                                        <Ionicons name={r.icon as any} size={13} color={Colors.textSecondary} />
                                        <Text style={styles.medLabel}>{r.label}</Text>
                                    </View>
                                    <Text style={[styles.medVal, r.red && !!r.value && { color: Colors.error, fontWeight: '900', fontSize: 17 }]}>{r.value || '--'}</Text>
                                </View>
                            ))}
                            {!!medicalInfo.medications && (
                                <View style={[styles.medRow, { borderBottomWidth: 0 }]}>
                                    <View style={styles.medLeft}><Ionicons name="document-text-outline" size={13} color={Colors.textSecondary} /><Text style={styles.medLabel}>Notes</Text></View>
                                    <Text style={[styles.medVal, { maxWidth: '58%', textAlign: 'right' }]}>{medicalInfo.medications}</Text>
                                </View>
                            )}
                        </View>
                    )}
                </Animated.View>

                {/* ── Emergency Contacts ── */}
                <Animated.View entering={FadeInUp.duration(500).delay(400)} style={styles.card}>
                    <View style={styles.cardHead}>
                        <View style={styles.cardTitleRow}>
                            <View style={[styles.cardIcon, { backgroundColor: Colors.errorBg }]}>
                                <Ionicons name="people" size={17} color={Colors.error} />
                            </View>
                            <Text style={styles.cardTitle}>Emergency Contacts</Text>
                        </View>
                        <TouchableOpacity style={[styles.addPill, isAddingContact && styles.addPillCancel]} onPress={() => setIsAddingContact(!isAddingContact)}>
                            <Ionicons name={isAddingContact ? 'close' : 'add'} size={14} color={isAddingContact ? Colors.textSecondary : Colors.white} />
                            <Text style={[styles.addPillText, isAddingContact && { color: Colors.textSecondary }]}>{isAddingContact ? 'Cancel' : 'Add'}</Text>
                        </TouchableOpacity>
                    </View>

                    {isAddingContact && (
                        <Animated.View entering={FadeInDown.duration(350)} style={styles.formStack}>
                            <TextInput style={styles.input} placeholder="Contact Name" placeholderTextColor={Colors.textTertiary} value={newName} onChangeText={setNewName} />
                            <TextInput style={styles.input} placeholder="Phone Number" placeholderTextColor={Colors.textTertiary} keyboardType="phone-pad" value={newPhone} onChangeText={setNewPhone} />
                            <TouchableOpacity style={styles.saveBtn} onPress={addContact} activeOpacity={0.85}>
                                <Ionicons name="checkmark-circle" size={18} color={Colors.white} />
                                <Text style={styles.saveBtnText}>Save Contact</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                    {contacts.map((contact, i) => (
                        <Animated.View key={contact.id} entering={FadeInUp.duration(400).delay(i * 70)}>
                            <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(`tel:${contact.phone}`)} onLongPress={() => deleteContact(contact.id)} activeOpacity={0.82}>
                                <View style={styles.contactAvi}>
                                    <Text style={styles.contactInitial}>{contact.name.charAt(0).toUpperCase()}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.contactName}>{contact.name}</Text>
                                    <Text style={styles.contactPhone}>{contact.phone}</Text>
                                </View>
                                <View style={styles.callBtn}>
                                    <Ionicons name="call" size={18} color={Colors.white} />
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                    ))}

                    {contacts.length === 0 && !isAddingContact && (
                        <View style={styles.emptyWrap}>
                            <Ionicons name="people-outline" size={32} color={Colors.primaryLight} />
                            <Text style={styles.emptyText}>No contacts yet</Text>
                            <Text style={styles.emptySub}>Add family members to alert during emergencies</Text>
                        </View>
                    )}
                </Animated.View>

                <View style={{ height: 48 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF5F5' },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16,
        backgroundColor: Colors.surface,
        borderBottomWidth: 2, borderBottomColor: Colors.error,
    },
    backBtn: {
        width: 42, height: 42, borderRadius: 13,
        backgroundColor: Colors.errorBg,
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
    headerSub: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary, marginTop: 1 },
    alertBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: Colors.errorBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
        borderWidth: 1, borderColor: '#FECDD3',
    },
    alertBadgeText: { fontSize: 11, fontWeight: '800', color: Colors.error, letterSpacing: 0.5 },

    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 },

    // SOS
    sosSection: { alignItems: 'center', marginBottom: 28 },
    sosHint: { fontSize: 11, fontWeight: '800', color: Colors.error, letterSpacing: 3, marginBottom: 22 },
    glowWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    glowRing: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(204,0,0,0.15)' },
    sosButton: {
        width: 152, height: 152, borderRadius: 76,
        backgroundColor: Colors.error,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 5, borderColor: Colors.white,
        shadowColor: Colors.error, shadowOpacity: 0.4, shadowRadius: 28, shadowOffset: { height: 6, width: 0 }, elevation: 18,
    },
    sosText: { fontSize: 46, fontWeight: '900', color: Colors.white, letterSpacing: 2, lineHeight: 50 },
    sosSub: { fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.9)', letterSpacing: 2 },
    sosCaption: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center', marginTop: 16 },
    
    ndrrmcBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: Colors.surface, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24,
        marginTop: 12, borderWidth: 1, borderColor: Colors.border,
        shadowColor: Shadows.small.shadowColor, shadowOpacity: Shadows.small.shadowOpacity, shadowRadius: Shadows.small.shadowRadius, shadowOffset: Shadows.small.shadowOffset, elevation: Shadows.small.elevation,
    },
    ndrrmcBtnText: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },

    // Quick Actions
    quickRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    quickCard: {
        flex: 1, backgroundColor: Colors.surface, borderRadius: 18, padding: 16,
        alignItems: 'center', gap: 6,
        borderWidth: 1, borderColor: '#FECDD3',
        shadowColor: Colors.error, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { height: 2, width: 0 }, elevation: 2,
    },
    qActive: { borderColor: Colors.error, backgroundColor: Colors.errorBg },
    qSirenActive: { borderColor: Colors.error, backgroundColor: Colors.errorBg },
    qIcon: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: Colors.errorBg, alignItems: 'center', justifyContent: 'center',
    },
    qIconActive: { backgroundColor: Colors.error },
    qIconSiren: { backgroundColor: Colors.error },
    qLabel: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
    qSub: { fontSize: 11, fontWeight: '500', color: Colors.textSecondary, textAlign: 'center' },

    // Cards
    card: {
        backgroundColor: Colors.surface, borderRadius: 20, padding: 20,
        marginBottom: 16, borderWidth: 1, borderColor: '#FECDD3',
        shadowColor: Colors.error, shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { height: 2, width: 0 }, elevation: 2,
    },
    cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cardIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    cardTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },

    editPill: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: Colors.errorBg, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12,
    },
    editPillText: { fontSize: 13, fontWeight: '700', color: Colors.error },

    // Disaster section
    disasterGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    disasterBtn: {
        flex: 1, alignItems: 'center', gap: 8, padding: 12,
        backgroundColor: '#FAFAFA', borderRadius: 16,
        borderWidth: 1, borderColor: Colors.border,
    },
    disasterIcon: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    disasterLabel: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },

    evacuateBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, backgroundColor: Colors.error,
        padding: 14, borderRadius: 14, marginBottom: 16,
    },
    evacuateBtnText: { flex: 1, textAlign: 'center', color: Colors.white, fontWeight: '700', fontSize: 15 },

    checklistBox: {
        backgroundColor: Colors.errorBg, borderRadius: 14, padding: 16,
        borderWidth: 1, borderColor: '#FECDD3',
    },
    checklistTitle: { fontSize: 13, fontWeight: '800', color: Colors.error, marginBottom: 10, letterSpacing: 0.3 },
    checkItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
    checkDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.error, marginTop: 5 },
    checkText: { fontSize: 13, fontWeight: '600', color: '#374151', flex: 1, lineHeight: 20 },

    // Medical
    medRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.errorBg,
    },
    medLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    medLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
    medVal: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },

    // Forms
    formStack: { gap: 10, marginTop: 4, marginBottom: 4 },
    input: {
        backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
        padding: 14, borderRadius: 14, fontSize: 15, color: Colors.textPrimary, fontWeight: '500',
    },

    // Contacts
    addPill: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: Colors.error, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    },
    addPillCancel: { backgroundColor: Colors.border },
    addPillText: { fontSize: 13, fontWeight: '700', color: Colors.white },
    saveBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, backgroundColor: '#15803D', padding: 14, borderRadius: 14, marginTop: 2,
    },
    saveBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },

    contactRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#FFF5F5', borderRadius: 16, padding: 14, marginBottom: 10,
        borderWidth: 1, borderColor: '#FECDD3',
    },
    contactAvi: {
        width: 46, height: 46, borderRadius: 23,
        backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center', marginRight: 14,
    },
    contactInitial: { fontSize: 18, fontWeight: '800', color: Colors.white },
    contactName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
    contactPhone: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
    callBtn: {
        width: 42, height: 42, borderRadius: 21,
        backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center',
    },

    emptyWrap: { alignItems: 'center', paddingVertical: 28 },
    emptyText: { fontSize: 15, fontWeight: '700', color: Colors.textTertiary, marginTop: 10 },
    emptySub: { fontSize: 13, color: '#CBD5E1', textAlign: 'center', marginTop: 4, paddingHorizontal: 20 },

    // Countdown Overlay
    countdownOverlay: {
        ...StyleSheet.absoluteFillObject, backgroundColor: Colors.error,
        zIndex: 100, alignItems: 'center', justifyContent: 'center', padding: 24,
    },
    countdownIconWrap: {
        width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    countdownTitle: { fontSize: 22, fontWeight: '900', color: Colors.white, letterSpacing: 1, textAlign: 'center', marginBottom: 8 },
    countdownSub: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginBottom: 4 },
    countdownNumber: { fontSize: 110, fontWeight: '900', color: Colors.white, marginBottom: 40, lineHeight: 120 },
    cancelButton: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: Colors.white, paddingHorizontal: 40, paddingVertical: 16, borderRadius: 18,
    },
    cancelButtonText: { color: Colors.error, fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
});
