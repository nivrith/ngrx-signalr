import { createReducer, on } from "@ngrx/store";
import { createSignalRHub, signalrHubUnstarted, signalrConnected, signalrDisconnected, signalrReconnecting, signalrConnecting } from "./actions";
const initialState = {
    hubStatuses: []
};
const reducer = createReducer(initialState, on(createSignalRHub, (state, action) => (Object.assign({}, state, { hubStatuses: state.hubStatuses.concat([{
            hubName: action.hubName,
            url: action.url,
            state: 'unstarted'
        }]) }))), on(signalrHubUnstarted, (state, action) => {
    return Object.assign({}, state, { hubStatuses: state.hubStatuses.map(hs => {
            if (hs.hubName === action.hubName && hs.url === action.url) {
                return Object.assign({}, hs, { state: 'unstarted' });
            }
            return hs;
        }) });
}), on(signalrConnecting, (state, action) => {
    return Object.assign({}, state, { hubStatuses: state.hubStatuses.map(hs => {
            if (hs.hubName === action.hubName && hs.url === action.url) {
                return Object.assign({}, hs, { state: 'connecting' });
            }
            return hs;
        }) });
}), on(signalrConnected, (state, action) => {
    return Object.assign({}, state, { hubStatuses: state.hubStatuses.map(hs => {
            if (hs.hubName === action.hubName && hs.url === action.url) {
                return Object.assign({}, hs, { state: 'connected' });
            }
            return hs;
        }) });
}), on(signalrDisconnected, (state, action) => {
    return Object.assign({}, state, { hubStatuses: state.hubStatuses.map(hs => {
            if (hs.hubName === action.hubName && hs.url === action.url) {
                return Object.assign({}, hs, { state: 'disconnected' });
            }
            return hs;
        }) });
}), on(signalrReconnecting, (state, action) => {
    return Object.assign({}, state, { hubStatuses: state.hubStatuses.map(hs => {
            if (hs.hubName === action.hubName && hs.url === action.url) {
                return Object.assign({}, hs, { state: 'reconnecting' });
            }
            return hs;
        }) });
}));
export function signalrReducer(state, action) {
    return reducer(state, action);
}
;
