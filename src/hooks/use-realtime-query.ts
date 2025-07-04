"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

type UseRealtimeQueryOptions<T> = {
    table: string;
    primaryKey: keyof T;
    filter?: {
        column: string;
        operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in';
        value: any;
    };
    orderBy?: {
        column: string;
        options?: {
            ascending: boolean;
        }
    }
}

export function useRealtimeQuery<T>({ table, primaryKey, filter, orderBy }: UseRealtimeQueryOptions<T>) {
    const supabase = createClient();
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        setLoading(true);
        const fetchData = async () => {
            let query = supabase.from(table).select();

            if (filter) {
                query = query.filter(filter.column, filter.operator, filter.value);
            }
            if (orderBy) {
                query = query.order(orderBy.column, orderBy.options)
            }

            const { data: initialData, error: initialError } = await query;
            
            if (initialError) {
                setError(initialError);
                setLoading(false);
                return;
            }
            
            setData(initialData as T[]);
            setLoading(false);
        };

        fetchData();

        const channel = supabase
            .channel(`public:${table}:${filter ? `${filter.column}-${filter.value}`: 'all'}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table },
                (payload) => {
                    setData(currentData => [...currentData, payload.new as T]);
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table },
                (payload) => {
                     setData(currentData => currentData.map(item => 
                        (item[primaryKey] === (payload.new as T)[primaryKey]) ? (payload.new as T) : item
                    ));
                }
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table },
                (payload) => {
                    setData(currentData => currentData.filter(item => 
                       item[primaryKey] !== (payload.old as T)[primaryKey]
                    ));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [table, filter?.column, filter?.value, orderBy?.column]);

    return { data, loading, error };
}
