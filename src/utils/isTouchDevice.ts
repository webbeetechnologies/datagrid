export function isTouchDevice() {
    return (
        !!(
            typeof window !== 'undefined' &&
            ('ontouchstart' in window ||
                ((window as any).DocumentTouch &&
                    typeof document !== 'undefined' &&
                    document instanceof (window as any).DocumentTouch))
        ) ||
        !!(
            typeof navigator !== 'undefined' &&
            // @ts-ignore
            (navigator.maxTouchPoints || navigator.msMaxTouchPoints)
        )
    );
}

const mobileReg =
    /(phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone)/i;

export function isPcDevice() {
    return !navigator.userAgent.match(mobileReg);
}
