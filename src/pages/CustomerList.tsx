// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Search, UserPlus, Mail, Phone, MapPin, Filter, MoreHorizontal, Edit, Trash2, Info } from 'lucide-react';
import { Inventory } from './Inventory';

export const CustomerList = () => {
    // We leverage the Inventory component's customer tab but rendered as a full page
    // This ensures consistency across the app as requested.
    return <Inventory initialTab="customers" />;
};

