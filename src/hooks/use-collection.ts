"use client";

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, orderBy, limit, startAfter, Query } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { QueryConstraint } from 'firebase/firestore';

interface Options {
  constraints?: QueryConstraint[];
  orderBy?: [string, 'asc' | 'desc'];
  limit?: number;
}

export function useCollection<T>(collectionName: string | null, options?: Options) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!collectionName) {
        setData(null);
        setLoading(false);
        return;
    }
    
    let q: Query = collection(db, collectionName);

    if (options?.orderBy) {
        q = query(q, orderBy(options.orderBy[0], options.orderBy[1]));
    }
    if (options?.constraints) {
        q = query(q, ...options.constraints);
    }
    if (options?.limit) {
        q = query(q, limit(options.limit));
    }


    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: T[] = [];
      snapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() } as unknown as T);
      });
      setData(results);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error(err);
      setError(err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionName, JSON.stringify(options)]);

  return { data, loading, error };
}
