import AsyncStorage from '@react-native-async-storage/async-storage';
import { MedicineAnalysis } from './gemini';
import { getAllReminders, saveReminder } from './medicationStorage';

export interface SavedScan {
    id: string;
    timestamp: number;
    imageUri: string;
    analysis: MedicineAnalysis[];
}

const STORAGE_KEY = 'recent_scans';

/**
 * Save a new scan to the recent list and auto-create reminders
 */
export const saveScan = async (analysis: MedicineAnalysis[], imageUri: string): Promise<SavedScan> => {
    try {
        const newScan: SavedScan = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            imageUri,
            analysis,
        };

        const existingScans = await getRecentScans();
        // Keep only top 20 recent scans
        const updatedScans = [newScan, ...existingScans].slice(0, 20);

        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedScans));

        // ── Auto-create reminders for each scanned medicine ──
        try {
            const existingReminders = await getAllReminders();
            const existingNames = existingReminders.map(r => r.medicineName.toLowerCase());

            const now = new Date();
            const startDate = now.toISOString().split('T')[0];
            const endDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
                .toISOString().split('T')[0];

            for (const med of analysis) {
                // Skip if already tracked or if it's a parse error
                if (
                    existingNames.includes(med.medicineName.toLowerCase()) ||
                    med.medicineName === 'Unknown Medicine' ||
                    med.medicineName === 'Error parsing results'
                ) continue;

                // Extract dosage from AI data
                const dose = med.dosage && med.dosage !== 'Not visible' ? med.dosage : '';

                // Determine frequency from simple instructions
                let frequency: 'Everyday' | '2x Daily' | '3x Daily' | 'Weekly' | 'As Needed' = 'Everyday';
                const instr = (med.simpleInstructions || med.dosage || '').toLowerCase();
                if (instr.includes('three times') || instr.includes('3 times') || instr.includes('tid') || instr.includes('3x')) {
                    frequency = '3x Daily';
                } else if (instr.includes('twice') || instr.includes('two times') || instr.includes('2 times') || instr.includes('bid') || instr.includes('2x')) {
                    frequency = '2x Daily';
                } else if (instr.includes('weekly') || instr.includes('once a week')) {
                    frequency = 'Weekly';
                } else if (instr.includes('as needed') || instr.includes('prn')) {
                    frequency = 'As Needed';
                }

                await saveReminder({
                    medicineName: med.medicineName,
                    frequency,
                    reminderTime: med.recommendedTime || '08:00',
                    dose,
                    measurement: frequency === 'Everyday' ? '1 time' : frequency === '2x Daily' ? '2 times' : frequency === '3x Daily' ? '3 times' : '1 time',
                    startDate,
                    endDate,
                });
            }
        } catch (reminderErr) {
            // Don't fail the scan save if reminders fail
            console.warn('Auto-reminder creation failed:', reminderErr);
        }

        return newScan;
    } catch (error) {
        console.error('Failed to save scan:', error);
        throw error;
    }
};

/**
 * Get all recent scans
 */
export const getRecentScans = async (): Promise<SavedScan[]> => {
    try {
        const json = await AsyncStorage.getItem(STORAGE_KEY);
        if (!json) return [];

        const data = JSON.parse(json);

        // Migration: Ensure all items have analysis as an array
        return data.map((item: any) => ({
            ...item,
            analysis: Array.isArray(item.analysis) ? item.analysis : [item.analysis]
        }));
    } catch (error) {
        console.error('Failed to load scans:', error);
        return [];
    }
};

/**
 * Clear all recent scans
 */
export const clearScans = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error('Failed to clear scans:', error);
    }
};
