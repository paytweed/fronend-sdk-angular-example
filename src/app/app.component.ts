import {Component} from '@angular/core';
import {FormBuilder} from '@angular/forms';
import {
    CoinGetTransactionsPayload,
    CoinTransaction,
} from "@paytweed/frontend-sdk";

import {TweedService} from '../tweed/tweed.service'

const enum LoadingMessages {
    loading = "Loading...",
    creatingWallet = "Creating a wallet...",
    loggingIn = "Logging in...",
    none = ""
}

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})


export class AppComponent {
    constructor(private tweed: TweedService, private formBuilder: FormBuilder) {

        this.blockchainsPromise = this.loadBlockchains()
    }

    private readonly blockchainsPromise;
    title = 'Tweed Angular Example';
    blockchains: string[] = [];
    selected_bc: string = '';
    address: string = ''
    transactions: CoinTransaction[] = []
    loading_message = LoadingMessages.loading

    async onBcSelected(bc: string) {
        localStorage.setItem("selectedBc", bc)
        this.selected_bc = bc;
        const payload: CoinGetTransactionsPayload = {blockchainIds: [bc]}
        const coin_transactions = await this.tweed.sdk.coin.getTransactions(payload);
        this.transactions = coin_transactions[bc]
        this.address = "loading address..."
        this.address = await this.tweed.sdk.wallet.getAddress({blockchainId: bc})

        this.loading_message = LoadingMessages.none
    }

    fieldValues(transaction: CoinTransaction) {
        const filed_names = this.filedNames()
        return [...filed_names].map((fn: keyof CoinTransaction) => this.valueToString(transaction[fn]))
    }

    escapeRegexp(s: string) {
        return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    valueToString(value: any) {
        const find2 = this.escapeRegexp('"');
        return JSON.stringify(value).replace(new RegExp(`^[${find2}]*(.*?)[${find2}]*$`), '$1')
    }

    filedNames() {
        return [...this.transactions.reduce((set: Set<keyof CoinTransaction>, transaction: CoinTransaction) => {
            const a: (keyof CoinTransaction)[] = Object.keys(transaction) as (keyof CoinTransaction)[]
            return new Set<keyof CoinTransaction>([...set, ...a])
        }, new Set<keyof CoinTransaction>())].filter(a => {
            return !['id', 'nonce', 'coinMetadata'].includes(a)
        })

    }

    async showQr() {
        await this.tweed.sdk.wallet.showAddress({blockchainId: this.selected_bc})
    }

    loginForm = this.formBuilder.group({
        email: '',
        user_id: ''
    });

    async handleLogin() {
        this.loading_message = LoadingMessages.loggingIn
        try {
            const formValue = this.loginForm.value;
            const currentWallet = await this.tweed.getUserDetails()
            if (currentWallet.id == formValue.user_id && currentWallet.email == formValue.email) {
                if (await this.tweed.sdk.wallet.loggedIn()) {
                    this.loading_message = LoadingMessages.none
                    alert("already logged in")
                    return;
                }
            }
            await this.tweed.setUserDetails(
                this.loginForm.value.user_id || "",
                this.loginForm.value.email || "",
            )
            const onSuccessLogin = async () => {
                await this.blockchainsPromise
                await this.onBcSelected(this.selected_bc)
            }
            const onFailLogin = async () => {
                if (confirm("it seems like you have a hard time to log in. would you like to reset your wallet?")) {
                    this.loading_message = LoadingMessages.creatingWallet
                    await this.tweed.sdk.wallet.recreate({callbacks: {onSuccess: onSuccessLogin}})
                    this.loading_message = LoadingMessages.none
                }
            }


            if (!await this.tweed.sdk.wallet.exists())
                await this.tweed.sdk.wallet.create()
            else
                await this.tweed.sdk.wallet.login({
                    callbacks: {
                        onSuccess: onSuccessLogin,
                        onClose: onFailLogin,
                        onError: () => console.error("error in log in!")
                    }
                })
            this.loading_message = LoadingMessages.none

        } catch (err) {
            console.error(err);
        } finally {
            this.loading_message = LoadingMessages.none
        }
    }

    async loadBlockchains() {
        try {
            const user_from_memory = await this.tweed.getUserDetails()
            this.loginForm.reset({
                email: '',
                user_id: '',
                ...(user_from_memory ? {email: user_from_memory.email, user_id: user_from_memory.id} : {})
            })

            if (!await this.tweed.sdk.wallet.exists()) {
                this.loading_message = LoadingMessages.creatingWallet
                await this.tweed.sdk.wallet.create()
            }

            this.blockchains = await this.tweed.sdk.blockchain.list()
            let defaultBc=this.blockchains[0];
            try{
               defaultBc = localStorage.getItem("selectedBc") || "";
               if (!defaultBc || !this.blockchains.includes(defaultBc))
                   defaultBc = this.blockchains[0]
            }
            catch (e) {
            }

            await this.onBcSelected(defaultBc)
            this.loading_message = LoadingMessages.none
            return this.blockchains
        } finally {
            this.loading_message = LoadingMessages.none
        }
    }

    async sendTransaction(target_address?: string) {
        if (!target_address)
            target_address = await this.tweed.sdk.wallet.getAddress({
                blockchainId: this.selected_bc,
            });
        await this.tweed.sdk.coin.sendToWallet({
            blockchainId: this.selected_bc,
            value: "0.1",
            walletAddress: target_address
        })
    }

    async createRecoveryKit() {
        await this.tweed.sdk.wallet.createRecovery()
    }

    async buyNft() {
        await this.tweed.sdk.nft.buyWithFiat({nftId: "1"})
    }

    async logout() {
        if (!(await this.tweed.sdk.wallet.loggedIn())) {
            alert("not logged in")
            return;
        }
        this.loading_message = LoadingMessages.loading
        try {
            if ((await this.tweed.sdk.wallet.getRecoveryStatus()).length !== 0 || confirm("You didn't create a recovery kit.\nAre you sure to logout without creating one?")) {
                await this.tweed.sdk.wallet.logout()
            } else
                await this.tweed.sdk.wallet.createRecovery()
        } finally {
            this.loading_message = LoadingMessages.none
        }

    }
}
