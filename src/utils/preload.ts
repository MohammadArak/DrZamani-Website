export async function preloadImages(images: string[]) {
    await Promise.all(
        images.map(
            (src) =>
                new Promise<void>((resolve) => {
                    const img = new Image();

                    img.src = src;

                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                })
        )
    );
}