export const getCookie = (name: string): string | null => {
    return (
        document.cookie
            .split('; ')
            .find((row) => row.startsWith(name + '='))
            ?.split('=')[1] || null
    );
};

export const deleteCookie = (name: string) => {
    document.cookie = `${name}=; Max-Age=0; path=/;`;
};
