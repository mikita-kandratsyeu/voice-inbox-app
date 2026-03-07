export const generateRecordId = () => `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
