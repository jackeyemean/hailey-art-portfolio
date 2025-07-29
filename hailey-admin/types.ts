// types.ts
export type RootStackParamList = {
  Login: undefined;
  List: { adminKey: string };
  Form: { artworkId?: string; adminKey: string };
};
