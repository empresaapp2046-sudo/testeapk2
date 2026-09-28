// @ts-nocheck
import React, { useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { playNotificationSound } from '../utils/sounds';

export const NotificationManager: React.FC = () => {
  const { settings, payables, sales, products } = useStore();
  const lastAlertTime = useRef<number>(0);

  useEffect(() => {
    const config = settings?.notificationSettings;
    if (!config?.enabled) return;

    const checkAlerts = () => {
      const now = Date.now();
      const repeatInterval = config.alarmRepeat;
      let repeatMs = 0;
      if (repeatInterval === '5m') repeatMs = 5 * 60 * 1000;
      else if (repeatInterval === '15m') repeatMs = 15 * 60 * 1000;
      else if (repeatInterval === '1h') repeatMs = 60 * 60 * 1000;

      // If we alerted recently, check if we should repeat
      if (repeatMs > 0 && now - lastAlertTime.current < repeatMs) {
        return;
      }
      
      // If no repeat, only alert once per session
      if (repeatMs === 0 && lastAlertTime.current > 0) {
        return;
      }

      let shouldAlert = false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check Low Stock
      if (config.alerts?.lowStock) {
        const threshold = settings.vitrineConfig?.lowStockThreshold || 5;
        const hasLowStock = products.some(p => {
            const hasVariations = (p.sizes?.length ?? 0) > 1 || (p.colors?.length ?? 0) > 1 || (p.numbers?.length ?? 0) > 1;
            if (hasVariations && p.variationStock) {
                return Object.values(p.variationStock).some(qty => qty <= threshold);
            }
            return (p.stock || 0) <= threshold;
        });
        if (hasLowStock) shouldAlert = true;
      }

      // Check Payables
      if (!shouldAlert && config.alerts?.payables) {
        const hasDuePayables = payables.some(p => {
          if (p.status === 'paid') return false;
          const dueDate = new Date(p.dueDate);
          dueDate.setHours(0,0,0,0);
          return dueDate <= today; // due today or overdue
        });
        if (hasDuePayables) shouldAlert = true;
      }

      // Check Installments
      if (!shouldAlert && config.alerts?.installments) {
        const advanceDays = config.installmentsAdvanceDays || 3;
        const advanceMs = advanceDays * 24 * 60 * 60 * 1000;
        
        const hasDueInstallments = sales.some(sale => {
          if (sale.status === 'completed' || !sale.payments) return false;
          return sale.payments.some(payment => {
            if (payment.method !== 'Crediário' || payment.isPaid || !payment.dueDate) return false;
            const dueDate = new Date(payment.dueDate);
            dueDate.setHours(0,0,0,0);
            return (dueDate.getTime() - today.getTime()) <= advanceMs;
          });
        });
        if (hasDueInstallments) shouldAlert = true;
      }

      if (shouldAlert) {
        if (config.soundEnabled && config.selectedSound) {
            playNotificationSound(config.selectedSound);
        }
        lastAlertTime.current = now;
      }
    };

    // Initial check
    checkAlerts();

    // Check every minute
    const interval = setInterval(checkAlerts, 60000);
    return () => clearInterval(interval);
  }, [settings, payables, sales, products]);

  return null;
};
