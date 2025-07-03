"use client";

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit, Query } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { QueryConstraint } from 'firebase/firestore';

interface Options {
  constraints?: QueryConstraint[];
  orderBy?: [string, 'asc' | 'desc'];
  limit?: number;
}

// The hook now accepts a Firestore Query object or a string path.
export function useCollection<T>(queryOrPath: Query | string | null, options?: Options) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!queryOrPath) {
        setData(null);
        setLoading(false);
        return;
    }
    
    let q: Query;

    if (typeof queryOrPath === 'string') {
        q = collection(db, queryOrPath);
        if (options?.orderBy) {
            q = query(q, orderBy(options.orderBy[0], options.orderBy[1]));
        }
        if (options?.constraints) {
            q = query(q, ...options.constraints);
        }
        if (options?.limit) {
            q = query(q, limit(options.limit));
        }
    } else {
        // If it's not a string, we assume it's a Firestore Query object.
        q = queryOrPath;
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
    // Re-run effect if the query or options change.
    // Using JSON.stringify for options is a simple way to deep-compare, but has limitations.
    // For this app's usage, it's sufficient. The query object itself is stable across re-renders unless its dependencies change.
  }, [queryOrPath, JSON.stringify(options)]);

  return { data, loading, error };
}
