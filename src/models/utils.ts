export type CopyWithPartial<T, K extends keyof T> = Omit<T, K> & Partial<T>
export type PickWithPartial<T, K extends keyof T> = Pick<T, K> & Partial<T>
