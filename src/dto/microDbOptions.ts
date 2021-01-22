export interface MicroDbOptions {
  /**
   * Where database files are stored
   */
  root?: string
}

export interface ModificationOperationOptions {
  /**
   * If consistent is set, MicroDb waits until delete operation is synced to persistent storage also
   */
  consistent?: boolean
}
