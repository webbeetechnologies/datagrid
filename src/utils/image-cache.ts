interface IImageOption {
    crossOrigin?: boolean;
}

export const imageCache = (() => {
    const imageMap: {
        [name: string]: {
            img: HTMLImageElement;
            success: boolean;
        };
    } = {};
    const imgPromises: any = [];

    function loadImage(name: string, src: string, option?: IImageOption) {
        imgPromises.push(
            new Promise((resolve, reject) => {
                const img = new Image();
                img.src = src;
                img.referrerPolicy = 'no-referrer';

                if (!option?.crossOrigin) {
                    img.crossOrigin = 'Anonymous';
                }

                imageMap[name] = {
                    img,
                    success: false,
                };

                try {
                    img.onload = () => {
                        imageMap[name] = {
                            img,
                            success: true,
                        };

                        resolve({
                            name,
                            img,
                        });
                    };
                } catch (err) {
                    // code never reach
                    imageMap[name] = {
                        img,
                        success: false,
                    };
                    reject(err);
                }
            }),
        );
    }

    function loadImageMap(urlMap: { [x: string]: string }) {
        Object.keys(urlMap).forEach(key => {
            loadImage(key, urlMap[key]);
        });
    }

    function imageMapOnload(callback: any) {
        Promise.all(imgPromises).then(callback);
    }

    function getImage(name: string) {
        const imgInfo = imageMap[name];

        if (imgInfo == null) {
            return null;
        }

        const { img, success } = imgInfo;

        if (!success) return false;
        return img;
    }

    return {
        loadImage,
        loadImageMap,
        getImage,
        imageMapOnload,
        imageMap,
    };
})();
