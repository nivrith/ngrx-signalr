var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable } from "@angular/core";
import { Actions, ofType, createEffect } from "@ngrx/effects";
import { of, merge, EMPTY, fromEvent, timer } from "rxjs";
import { map, mergeMap, catchError, tap, startWith, switchMap, takeUntil, groupBy } from 'rxjs/operators';
import { findHub, createHub } from "./hub";
import { createSignalRHub, signalrHubUnstarted, signalrHubFailedToStart, signalrConnected, signalrDisconnected, signalrError, startSignalRHub, signalrConnecting, signalrReconnecting } from "./actions";
import { ofHub, exhaustMapHubToAction } from "./operators";
let SignalREffects = class SignalREffects {
    constructor(actions$) {
        this.actions$ = actions$;
        // handle hub creation (then hub unstarted by default)
        this.createHub$ = createEffect(() => this.actions$.pipe(ofType(createSignalRHub), mergeMap(action => {
            const hub = createHub(action.hubName, action.url);
            if (!hub) {
                return EMPTY;
            }
            return of(signalrHubUnstarted({ hubName: hub.hubName, url: hub.url }));
        })));
        // listen to start result (success/fail)
        // listen to change connection state (connecting, connected, disconnected, reconnecting)
        // listen to hub error
        this.beforeStartHub$ = createEffect(() => this.actions$.pipe(ofType(signalrHubUnstarted), mergeMap(action => {
            const hub = findHub(action);
            if (!hub) {
                return EMPTY;
            }
            const start$ = hub.start$.pipe(mergeMap(_ => EMPTY), catchError(error => of(signalrHubFailedToStart({ hubName: action.hubName, url: action.url, error }))));
            const state$ = hub.state$.pipe(mergeMap(state => {
                if (state === 'connecting') {
                    return of(signalrConnecting({ hubName: action.hubName, url: action.url }));
                }
                if (state === 'connected') {
                    return of(signalrConnected({ hubName: action.hubName, url: action.url }));
                }
                if (state === 'disconnected') {
                    return of(signalrDisconnected({ hubName: action.hubName, url: action.url }));
                }
                if (state === 'reconnecting') {
                    return of(signalrReconnecting({ hubName: action.hubName, url: action.url }));
                }
                return EMPTY;
            }));
            const error$ = hub.error$.pipe(map(error => signalrError({ hubName: action.hubName, url: action.url, error })));
            return merge(start$, state$, error$);
        })));
        // start hub
        this.startHub$ = createEffect(() => this.actions$.pipe(ofType(startSignalRHub), tap(action => {
            const hub = findHub(action);
            if (hub) {
                hub.start(action.options);
            }
        })), { dispatch: false });
    }
};
SignalREffects = __decorate([
    Injectable({
        providedIn: 'root'
    }),
    __metadata("design:paramtypes", [Actions])
], SignalREffects);
export { SignalREffects };
const offline$ = fromEvent(window, 'offline').pipe(map(() => false));
const online$ = fromEvent(window, 'online').pipe(map(() => true));
const isOnline = () => merge(offline$, online$).pipe(startWith(navigator.onLine));
export const createReconnectEffect = (actions$, intervalTimespan) => {
    return createEffect(() => actions$.pipe(ofType(signalrDisconnected), groupBy(action => action.hubName), mergeMap(group => group.pipe(exhaustMapHubToAction(({ action, hub }) => isOnline().pipe(switchMap(online => {
        if (!online) {
            return EMPTY;
        }
        return timer(0, intervalTimespan);
    }), map(_ => startSignalRHub({
        hubName: hub.hubName,
        url: hub.url,
        options: hub.options
    })), takeUntil(actions$.pipe(ofType(signalrConnected), ofHub(action)))))))));
};
