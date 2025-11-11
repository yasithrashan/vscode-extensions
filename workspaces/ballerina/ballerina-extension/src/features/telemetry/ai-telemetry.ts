import { getLoginMethod, getBIIntelUserEmail } from "../../utils/ai/auth";

export interface User {
    Users: {
        userType: string;
        userEmail: string;
    };
}

export async function getExtensionLogins(): Promise<string> {
    return await getLoginMethod();
}

export async function getUserProperties(): Promise<User> {
    const userType = await getExtensionLogins();
    const userEmail = await getBIIntelUserEmail();
    return {
        Users: {
            userType: userType,
            userEmail: userEmail || '',
        },
    };
}

export async function getUserObject(): Promise<User> {
    return await getUserProperties();
}