import { getLoginMethod, getBIIntelUserEmail } from "../../utils/ai/auth";

export interface userCredentials {
    user: {
        userLoginMethod: string;
        userEmail: string;
    };
}

export async function getuserProperties(): Promise<userCredentials> {
    const loginMethod = await getLoginMethod();
    const userEmail = await getBIIntelUserEmail();
    return {
        user: {
            userLoginMethod: loginMethod,
            userEmail: userEmail || '',
        },
    };
}
