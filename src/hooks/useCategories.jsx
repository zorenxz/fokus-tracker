import { useState, useEffect, useCallback } from "react";
import { onSnapshot, setDoc } from "firebase/firestore";
import { docRef } from "../lib/utils.js";
import { DEFAULT_CATEGORIES } from "../lib/constants.js";

export function useCategories(uid) {
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const ref = docRef(uid, "categories");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists() && snap.data().items?.length) {
        setCategories(snap.data().items);
      } else {
        // First-time user → save defaults
        setDoc(ref, { items: DEFAULT_CATEGORIES });
        setCategories(DEFAULT_CATEGORIES);
      }
      setLoaded(true);
    }, (err) => {
      console.error("Categories load error:", err);
      setLoaded(true);
    });
    return unsub;
  }, [uid]);

  const saveCategories = useCallback(async (newCats) => {
    if (!uid) return;
    setCategories(newCats);
    try {
      await setDoc(docRef(uid, "categories"), { items: newCats });
    } catch (e) {
      console.error("Categories save error:", e);
    }
  }, [uid]);

  return { categories, saveCategories, loaded };
}
