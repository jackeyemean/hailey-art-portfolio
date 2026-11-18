// components/useLeaveGuard.tsx: asks before leaving a screen with unsaved changes
import React, { useEffect, useRef, useState } from 'react';
import { NavigationProp } from '@react-navigation/native';
import ConfirmationModal from './ConfirmationModal';

/**
 * Blocks every way of leaving (back button, swipe, hardware back) while `isDirty`, and asks first.
 * Call `leave()` to go back without asking, e.g. after a successful save.
 * Render `modal` somewhere in the screen.
 */
export function useLeaveGuard(navigation: NavigationProp<any>, isDirty: boolean) {
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);
  const allowLeave = useRef(false);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (allowLeave.current || !isDirty) return;
        e.preventDefault();
        setPendingLeave(() => () => {
          allowLeave.current = true;
          navigation.dispatch(e.data.action);
        });
      }),
    [navigation, isDirty],
  );

  const leave = () => {
    allowLeave.current = true;
    navigation.goBack();
  };

  const modal = (
    <ConfirmationModal
      visible={pendingLeave !== null}
      title="Discard changes?"
      message="Your unsaved changes will be lost."
      onConfirm={() => {
        const go = pendingLeave;
        setPendingLeave(null);
        go?.();
      }}
      onCancel={() => setPendingLeave(null)}
      confirmText="Discard"
      cancelText="Keep editing"
      isDestructive
    />
  );

  return { leave, modal };
}
