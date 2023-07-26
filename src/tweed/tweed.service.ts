import {Injectable} from '@angular/core';
import {TweedFrontendSDKApi} from "@paytweed/frontend-sdk";
import {TweedFrontendSDK} from "@paytweed/frontend-sdk";

@Injectable({
    providedIn: 'root'
})

export class TweedService {
    sdk: TweedFrontendSDKApi

    constructor() {
        this.sdk = TweedFrontendSDK.setup({sendMessageToBackend: this.sendMessageToBackend});
    }

    sendMessageToBackend = async (message: string) => {
        const response = await this.sendToBackend({message}, 'message');
        const {answer} = response;
        return answer;
    }

    private async sendUserMessageToBackend(message?: { id: string, email: string }) {
        return await this.sendToBackend(message, 'user');
    }

    async setUserDetails(id: string, email: string) {
        return await this.sendUserMessageToBackend({
            id: id,
            email: email,
        })
    }

    async getUserDetails():Promise<{ id: string, email: string }> {
        return await this.sendUserMessageToBackend()
    }


    private async sendToBackend(message: any, route: string) {
        const body = JSON.stringify(message)
        const response = await fetch(`http://localhost:3010/${route}`, {
            body,
            headers: {"Content-Type": "application/json"},
            method: "POST",
        });
        return await response.json()
    }
}
