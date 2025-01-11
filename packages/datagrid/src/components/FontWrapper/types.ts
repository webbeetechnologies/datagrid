type RNModule = number;
type ESModule = {
    __esModule: true;
    default: string;
};
export type DataModule = RNModule | ESModule;
