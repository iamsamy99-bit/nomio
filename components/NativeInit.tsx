'use client'

import { useEffect } from 'react'
import { initNative } from '@/lib/native-init'

// Runs the Capacitor native shell setup once on mount. No-op in the browser.
export default function NativeInit() {
  useEffect(() => {
    initNative()
  }, [])
  return null
}
