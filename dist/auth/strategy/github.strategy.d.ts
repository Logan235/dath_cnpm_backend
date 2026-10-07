import { Strategy, Profile as Pro } from 'passport-github2';
import { AuthService } from '../auth.service';
declare const GithubStrategy_base: new (...args: [options: import("passport-github2").StrategyOptionsWithRequest] | [options: import("passport-github2").StrategyOptions]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class GithubStrategy extends GithubStrategy_base {
    private authService;
    constructor(authService: AuthService);
    validate(accessToken: string, refreshToken: string, profile: Pro): Promise<import("../../users/entities/user.entity").User>;
}
export {};
