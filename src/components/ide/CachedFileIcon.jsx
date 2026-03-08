import React, { useEffect, useRef, useState } from 'react';
import { getIconUrl, iconCache, subscribeCacheUpdate, fetchAndCacheIcon } from '@/lib/fileIcons';

export function CachedFileIcon({ filename, isFolder = false, isOpen = false, size = 14, style = {}, className = '' }) {
    const cdnUrl = getIconUrl(filename, isFolder, isOpen);
    const isDataUri = cdnUrl.startsWith('data:');

    // We only use state for the initial check (is it cached natively). 
    // Once mounted, we use ref-based updates to avoid re-render cascades.
    const [isLoaded, setIsLoaded] = useState(isDataUri || iconCache.has(cdnUrl));
    const imgRef = useRef(null);

    useEffect(() => {
        if (isDataUri) return;

        let isMounted = true;

        // If already cached, just ensure the ref is populated 
        if (iconCache.has(cdnUrl)) {
            const cached = iconCache.get(cdnUrl);
            if (cached && imgRef.current) imgRef.current.src = cached;
            if (!isLoaded) setIsLoaded(true);
            return;
        }

        const unsub = subscribeCacheUpdate(cdnUrl, () => {
            const cached = iconCache.get(cdnUrl);
            if (cached && imgRef.current) {
                imgRef.current.src = cached;
            }
            if (isMounted && !isLoaded) {
                setIsLoaded(true);
            }
        });

        fetchAndCacheIcon(cdnUrl);
        return () => {
            isMounted = false;
            unsub();
        };
    }, [cdnUrl, isDataUri, isLoaded]);

    return (
        <div
            className={className}
            style={{
                width: size,
                height: size,
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                ...style
            }}
        >
            <img
                ref={imgRef}
                src={isDataUri ? cdnUrl : (iconCache.get(cdnUrl) || '')}
                alt=""
                width={size}
                height={size}
                style={{
                    display: isLoaded ? 'block' : 'none',
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                }}
            />
        </div>
    );
}
