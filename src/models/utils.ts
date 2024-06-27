export type CopyWithPartial<T, K extends keyof T> = Omit<T, K> & Partial<T>
export type PickWithPartial<T, K extends keyof T> = Pick<T, K> & Partial<T>
export type PartialWithPick<T, K extends keyof T> = Partial<T> & Pick<T, K>
