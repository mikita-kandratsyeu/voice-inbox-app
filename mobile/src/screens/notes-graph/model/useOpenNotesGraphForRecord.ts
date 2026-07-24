import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';

import { openPlanPaywall } from '@/app/navigation/openPlanPaywall';
import type { RootStackParamList } from '@/app/navigation/types';
import { useProEntitlement } from '@/features/pro-license';

export const DEFAULT_LOCAL_GRAPH_DEPTH = 2;

export function useOpenNotesGraphForRecord() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isProActive } = useProEntitlement();
  const [notesGraphProSheetVisible, setNotesGraphProSheetVisible] = useState(false);

  const openNotesGraphForRecord = useCallback(
    (recordId: string, localDepth: 1 | 2 = DEFAULT_LOCAL_GRAPH_DEPTH) => {
      if (!isProActive) {
        setNotesGraphProSheetVisible(true);
        return;
      }

      navigation.navigate('NotesGraph', { focusRecordId: recordId, localDepth });
    },
    [isProActive, navigation],
  );

  const closeNotesGraphProSheet = useCallback(() => {
    setNotesGraphProSheetVisible(false);
  }, []);

  const upgradeNotesGraphFromProSheet = useCallback(() => {
    setNotesGraphProSheetVisible(false);
    openPlanPaywall();
  }, []);

  return {
    openNotesGraphForRecord,
    notesGraphProSheetVisible,
    closeNotesGraphProSheet,
    upgradeNotesGraphFromProSheet,
  };
}
