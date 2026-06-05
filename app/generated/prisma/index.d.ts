
/**
 * Client
**/

import * as runtime from './runtime/client.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model User
 * 
 */
export type User = $Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model Ship
 * 
 */
export type Ship = $Result.DefaultSelection<Prisma.$ShipPayload>
/**
 * Model Fleet
 * 
 */
export type Fleet = $Result.DefaultSelection<Prisma.$FleetPayload>
/**
 * Model Lobby
 * 
 */
export type Lobby = $Result.DefaultSelection<Prisma.$LobbyPayload>
/**
 * Model Game
 * 
 */
export type Game = $Result.DefaultSelection<Prisma.$GamePayload>
/**
 * Model GameTurn
 * 
 */
export type GameTurn = $Result.DefaultSelection<Prisma.$GameTurnPayload>
/**
 * Model Map
 * 
 */
export type Map = $Result.DefaultSelection<Prisma.$MapPayload>
/**
 * Model Config
 * 
 */
export type Config = $Result.DefaultSelection<Prisma.$ConfigPayload>
/**
 * Model PlayerStats
 * 
 */
export type PlayerStats = $Result.DefaultSelection<Prisma.$PlayerStatsPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const LobbyStatus: {
  OPEN: 'OPEN',
  FLEET_SELECTION: 'FLEET_SELECTION',
  IN_GAME: 'IN_GAME',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED'
};

export type LobbyStatus = (typeof LobbyStatus)[keyof typeof LobbyStatus]


export const GamePhase: {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  TIMED_OUT: 'TIMED_OUT',
  ABANDONED: 'ABANDONED'
};

export type GamePhase = (typeof GamePhase)[keyof typeof GamePhase]

}

export type LobbyStatus = $Enums.LobbyStatus

export const LobbyStatus: typeof $Enums.LobbyStatus

export type GamePhase = $Enums.GamePhase

export const GamePhase: typeof $Enums.GamePhase

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient({
 *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
 * })
 * // Fetch zero or more Users
 * const users = await prisma.user.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://pris.ly/d/client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient({
   *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
   * })
   * // Fetch zero or more Users
   * const users = await prisma.user.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://pris.ly/d/client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/orm/prisma-client/queries/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>

  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.ship`: Exposes CRUD operations for the **Ship** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Ships
    * const ships = await prisma.ship.findMany()
    * ```
    */
  get ship(): Prisma.ShipDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.fleet`: Exposes CRUD operations for the **Fleet** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Fleets
    * const fleets = await prisma.fleet.findMany()
    * ```
    */
  get fleet(): Prisma.FleetDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.lobby`: Exposes CRUD operations for the **Lobby** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Lobbies
    * const lobbies = await prisma.lobby.findMany()
    * ```
    */
  get lobby(): Prisma.LobbyDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.game`: Exposes CRUD operations for the **Game** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Games
    * const games = await prisma.game.findMany()
    * ```
    */
  get game(): Prisma.GameDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.gameTurn`: Exposes CRUD operations for the **GameTurn** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more GameTurns
    * const gameTurns = await prisma.gameTurn.findMany()
    * ```
    */
  get gameTurn(): Prisma.GameTurnDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.map`: Exposes CRUD operations for the **Map** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Maps
    * const maps = await prisma.map.findMany()
    * ```
    */
  get map(): Prisma.MapDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.config`: Exposes CRUD operations for the **Config** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Configs
    * const configs = await prisma.config.findMany()
    * ```
    */
  get config(): Prisma.ConfigDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.playerStats`: Exposes CRUD operations for the **PlayerStats** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more PlayerStats
    * const playerStats = await prisma.playerStats.findMany()
    * ```
    */
  get playerStats(): Prisma.PlayerStatsDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 7.8.0
   * Query Engine version: 3c6e192761c0362d496ed980de936e2f3cebcd3a
   */
  export type PrismaVersion = {
    client: string
    engine: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    User: 'User',
    Ship: 'Ship',
    Fleet: 'Fleet',
    Lobby: 'Lobby',
    Game: 'Game',
    GameTurn: 'GameTurn',
    Map: 'Map',
    Config: 'Config',
    PlayerStats: 'PlayerStats'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]



  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "user" | "ship" | "fleet" | "lobby" | "game" | "gameTurn" | "map" | "config" | "playerStats"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UserUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>
            result: $Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      Ship: {
        payload: Prisma.$ShipPayload<ExtArgs>
        fields: Prisma.ShipFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ShipFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShipPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ShipFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShipPayload>
          }
          findFirst: {
            args: Prisma.ShipFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShipPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ShipFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShipPayload>
          }
          findMany: {
            args: Prisma.ShipFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShipPayload>[]
          }
          create: {
            args: Prisma.ShipCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShipPayload>
          }
          createMany: {
            args: Prisma.ShipCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ShipCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShipPayload>[]
          }
          delete: {
            args: Prisma.ShipDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShipPayload>
          }
          update: {
            args: Prisma.ShipUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShipPayload>
          }
          deleteMany: {
            args: Prisma.ShipDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ShipUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ShipUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShipPayload>[]
          }
          upsert: {
            args: Prisma.ShipUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShipPayload>
          }
          aggregate: {
            args: Prisma.ShipAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateShip>
          }
          groupBy: {
            args: Prisma.ShipGroupByArgs<ExtArgs>
            result: $Utils.Optional<ShipGroupByOutputType>[]
          }
          count: {
            args: Prisma.ShipCountArgs<ExtArgs>
            result: $Utils.Optional<ShipCountAggregateOutputType> | number
          }
        }
      }
      Fleet: {
        payload: Prisma.$FleetPayload<ExtArgs>
        fields: Prisma.FleetFieldRefs
        operations: {
          findUnique: {
            args: Prisma.FleetFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FleetPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.FleetFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FleetPayload>
          }
          findFirst: {
            args: Prisma.FleetFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FleetPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.FleetFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FleetPayload>
          }
          findMany: {
            args: Prisma.FleetFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FleetPayload>[]
          }
          create: {
            args: Prisma.FleetCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FleetPayload>
          }
          createMany: {
            args: Prisma.FleetCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.FleetCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FleetPayload>[]
          }
          delete: {
            args: Prisma.FleetDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FleetPayload>
          }
          update: {
            args: Prisma.FleetUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FleetPayload>
          }
          deleteMany: {
            args: Prisma.FleetDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.FleetUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.FleetUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FleetPayload>[]
          }
          upsert: {
            args: Prisma.FleetUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FleetPayload>
          }
          aggregate: {
            args: Prisma.FleetAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateFleet>
          }
          groupBy: {
            args: Prisma.FleetGroupByArgs<ExtArgs>
            result: $Utils.Optional<FleetGroupByOutputType>[]
          }
          count: {
            args: Prisma.FleetCountArgs<ExtArgs>
            result: $Utils.Optional<FleetCountAggregateOutputType> | number
          }
        }
      }
      Lobby: {
        payload: Prisma.$LobbyPayload<ExtArgs>
        fields: Prisma.LobbyFieldRefs
        operations: {
          findUnique: {
            args: Prisma.LobbyFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LobbyPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.LobbyFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LobbyPayload>
          }
          findFirst: {
            args: Prisma.LobbyFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LobbyPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.LobbyFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LobbyPayload>
          }
          findMany: {
            args: Prisma.LobbyFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LobbyPayload>[]
          }
          create: {
            args: Prisma.LobbyCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LobbyPayload>
          }
          createMany: {
            args: Prisma.LobbyCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.LobbyCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LobbyPayload>[]
          }
          delete: {
            args: Prisma.LobbyDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LobbyPayload>
          }
          update: {
            args: Prisma.LobbyUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LobbyPayload>
          }
          deleteMany: {
            args: Prisma.LobbyDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.LobbyUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.LobbyUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LobbyPayload>[]
          }
          upsert: {
            args: Prisma.LobbyUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LobbyPayload>
          }
          aggregate: {
            args: Prisma.LobbyAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateLobby>
          }
          groupBy: {
            args: Prisma.LobbyGroupByArgs<ExtArgs>
            result: $Utils.Optional<LobbyGroupByOutputType>[]
          }
          count: {
            args: Prisma.LobbyCountArgs<ExtArgs>
            result: $Utils.Optional<LobbyCountAggregateOutputType> | number
          }
        }
      }
      Game: {
        payload: Prisma.$GamePayload<ExtArgs>
        fields: Prisma.GameFieldRefs
        operations: {
          findUnique: {
            args: Prisma.GameFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GamePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.GameFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GamePayload>
          }
          findFirst: {
            args: Prisma.GameFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GamePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.GameFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GamePayload>
          }
          findMany: {
            args: Prisma.GameFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GamePayload>[]
          }
          create: {
            args: Prisma.GameCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GamePayload>
          }
          createMany: {
            args: Prisma.GameCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.GameCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GamePayload>[]
          }
          delete: {
            args: Prisma.GameDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GamePayload>
          }
          update: {
            args: Prisma.GameUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GamePayload>
          }
          deleteMany: {
            args: Prisma.GameDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.GameUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.GameUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GamePayload>[]
          }
          upsert: {
            args: Prisma.GameUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GamePayload>
          }
          aggregate: {
            args: Prisma.GameAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateGame>
          }
          groupBy: {
            args: Prisma.GameGroupByArgs<ExtArgs>
            result: $Utils.Optional<GameGroupByOutputType>[]
          }
          count: {
            args: Prisma.GameCountArgs<ExtArgs>
            result: $Utils.Optional<GameCountAggregateOutputType> | number
          }
        }
      }
      GameTurn: {
        payload: Prisma.$GameTurnPayload<ExtArgs>
        fields: Prisma.GameTurnFieldRefs
        operations: {
          findUnique: {
            args: Prisma.GameTurnFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GameTurnPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.GameTurnFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GameTurnPayload>
          }
          findFirst: {
            args: Prisma.GameTurnFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GameTurnPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.GameTurnFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GameTurnPayload>
          }
          findMany: {
            args: Prisma.GameTurnFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GameTurnPayload>[]
          }
          create: {
            args: Prisma.GameTurnCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GameTurnPayload>
          }
          createMany: {
            args: Prisma.GameTurnCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.GameTurnCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GameTurnPayload>[]
          }
          delete: {
            args: Prisma.GameTurnDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GameTurnPayload>
          }
          update: {
            args: Prisma.GameTurnUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GameTurnPayload>
          }
          deleteMany: {
            args: Prisma.GameTurnDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.GameTurnUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.GameTurnUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GameTurnPayload>[]
          }
          upsert: {
            args: Prisma.GameTurnUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GameTurnPayload>
          }
          aggregate: {
            args: Prisma.GameTurnAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateGameTurn>
          }
          groupBy: {
            args: Prisma.GameTurnGroupByArgs<ExtArgs>
            result: $Utils.Optional<GameTurnGroupByOutputType>[]
          }
          count: {
            args: Prisma.GameTurnCountArgs<ExtArgs>
            result: $Utils.Optional<GameTurnCountAggregateOutputType> | number
          }
        }
      }
      Map: {
        payload: Prisma.$MapPayload<ExtArgs>
        fields: Prisma.MapFieldRefs
        operations: {
          findUnique: {
            args: Prisma.MapFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MapPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.MapFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MapPayload>
          }
          findFirst: {
            args: Prisma.MapFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MapPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.MapFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MapPayload>
          }
          findMany: {
            args: Prisma.MapFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MapPayload>[]
          }
          create: {
            args: Prisma.MapCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MapPayload>
          }
          createMany: {
            args: Prisma.MapCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.MapCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MapPayload>[]
          }
          delete: {
            args: Prisma.MapDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MapPayload>
          }
          update: {
            args: Prisma.MapUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MapPayload>
          }
          deleteMany: {
            args: Prisma.MapDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.MapUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.MapUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MapPayload>[]
          }
          upsert: {
            args: Prisma.MapUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MapPayload>
          }
          aggregate: {
            args: Prisma.MapAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateMap>
          }
          groupBy: {
            args: Prisma.MapGroupByArgs<ExtArgs>
            result: $Utils.Optional<MapGroupByOutputType>[]
          }
          count: {
            args: Prisma.MapCountArgs<ExtArgs>
            result: $Utils.Optional<MapCountAggregateOutputType> | number
          }
        }
      }
      Config: {
        payload: Prisma.$ConfigPayload<ExtArgs>
        fields: Prisma.ConfigFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ConfigFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfigPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ConfigFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfigPayload>
          }
          findFirst: {
            args: Prisma.ConfigFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfigPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ConfigFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfigPayload>
          }
          findMany: {
            args: Prisma.ConfigFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfigPayload>[]
          }
          create: {
            args: Prisma.ConfigCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfigPayload>
          }
          createMany: {
            args: Prisma.ConfigCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ConfigCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfigPayload>[]
          }
          delete: {
            args: Prisma.ConfigDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfigPayload>
          }
          update: {
            args: Prisma.ConfigUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfigPayload>
          }
          deleteMany: {
            args: Prisma.ConfigDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ConfigUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ConfigUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfigPayload>[]
          }
          upsert: {
            args: Prisma.ConfigUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfigPayload>
          }
          aggregate: {
            args: Prisma.ConfigAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateConfig>
          }
          groupBy: {
            args: Prisma.ConfigGroupByArgs<ExtArgs>
            result: $Utils.Optional<ConfigGroupByOutputType>[]
          }
          count: {
            args: Prisma.ConfigCountArgs<ExtArgs>
            result: $Utils.Optional<ConfigCountAggregateOutputType> | number
          }
        }
      }
      PlayerStats: {
        payload: Prisma.$PlayerStatsPayload<ExtArgs>
        fields: Prisma.PlayerStatsFieldRefs
        operations: {
          findUnique: {
            args: Prisma.PlayerStatsFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlayerStatsPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.PlayerStatsFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlayerStatsPayload>
          }
          findFirst: {
            args: Prisma.PlayerStatsFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlayerStatsPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.PlayerStatsFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlayerStatsPayload>
          }
          findMany: {
            args: Prisma.PlayerStatsFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlayerStatsPayload>[]
          }
          create: {
            args: Prisma.PlayerStatsCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlayerStatsPayload>
          }
          createMany: {
            args: Prisma.PlayerStatsCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.PlayerStatsCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlayerStatsPayload>[]
          }
          delete: {
            args: Prisma.PlayerStatsDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlayerStatsPayload>
          }
          update: {
            args: Prisma.PlayerStatsUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlayerStatsPayload>
          }
          deleteMany: {
            args: Prisma.PlayerStatsDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.PlayerStatsUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.PlayerStatsUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlayerStatsPayload>[]
          }
          upsert: {
            args: Prisma.PlayerStatsUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlayerStatsPayload>
          }
          aggregate: {
            args: Prisma.PlayerStatsAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregatePlayerStats>
          }
          groupBy: {
            args: Prisma.PlayerStatsGroupByArgs<ExtArgs>
            result: $Utils.Optional<PlayerStatsGroupByOutputType>[]
          }
          count: {
            args: Prisma.PlayerStatsCountArgs<ExtArgs>
            result: $Utils.Optional<PlayerStatsCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://pris.ly/d/logging).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory
    /**
     * Prisma Accelerate URL allowing the client to connect through Accelerate instead of a direct database.
     */
    accelerateUrl?: string
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
    /**
     * SQL commenter plugins that add metadata to SQL queries as comments.
     * Comments follow the sqlcommenter format: https://google.github.io/sqlcommenter/
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   adapter,
     *   comments: [
     *     traceContext(),
     *     queryInsights(),
     *   ],
     * })
     * ```
     */
    comments?: runtime.SqlCommenterPlugin[]
  }
  export type GlobalOmitConfig = {
    user?: UserOmit
    ship?: ShipOmit
    fleet?: FleetOmit
    lobby?: LobbyOmit
    game?: GameOmit
    gameTurn?: GameTurnOmit
    map?: MapOmit
    config?: ConfigOmit
    playerStats?: PlayerStatsOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type UserCountOutputType
   */

  export type UserCountOutputType = {
    ships: number
    lobbiesCreated: number
    lobbiesJoined: number
    lobbiesReserved: number
    gamesAsPlayer1: number
    gamesAsPlayer2: number
    fleets: number
  }

  export type UserCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    ships?: boolean | UserCountOutputTypeCountShipsArgs
    lobbiesCreated?: boolean | UserCountOutputTypeCountLobbiesCreatedArgs
    lobbiesJoined?: boolean | UserCountOutputTypeCountLobbiesJoinedArgs
    lobbiesReserved?: boolean | UserCountOutputTypeCountLobbiesReservedArgs
    gamesAsPlayer1?: boolean | UserCountOutputTypeCountGamesAsPlayer1Args
    gamesAsPlayer2?: boolean | UserCountOutputTypeCountGamesAsPlayer2Args
    fleets?: boolean | UserCountOutputTypeCountFleetsArgs
  }

  // Custom InputTypes
  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCountOutputType
     */
    select?: UserCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountShipsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ShipWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountLobbiesCreatedArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: LobbyWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountLobbiesJoinedArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: LobbyWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountLobbiesReservedArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: LobbyWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountGamesAsPlayer1Args<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: GameWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountGamesAsPlayer2Args<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: GameWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountFleetsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FleetWhereInput
  }


  /**
   * Count Type LobbyCountOutputType
   */

  export type LobbyCountOutputType = {
    fleets: number
  }

  export type LobbyCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    fleets?: boolean | LobbyCountOutputTypeCountFleetsArgs
  }

  // Custom InputTypes
  /**
   * LobbyCountOutputType without action
   */
  export type LobbyCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LobbyCountOutputType
     */
    select?: LobbyCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * LobbyCountOutputType without action
   */
  export type LobbyCountOutputTypeCountFleetsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FleetWhereInput
  }


  /**
   * Count Type GameCountOutputType
   */

  export type GameCountOutputType = {
    turns: number
  }

  export type GameCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    turns?: boolean | GameCountOutputTypeCountTurnsArgs
  }

  // Custom InputTypes
  /**
   * GameCountOutputType without action
   */
  export type GameCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GameCountOutputType
     */
    select?: GameCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * GameCountOutputType without action
   */
  export type GameCountOutputTypeCountTurnsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: GameTurnWhereInput
  }


  /**
   * Count Type MapCountOutputType
   */

  export type MapCountOutputType = {
    lobbies: number
  }

  export type MapCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    lobbies?: boolean | MapCountOutputTypeCountLobbiesArgs
  }

  // Custom InputTypes
  /**
   * MapCountOutputType without action
   */
  export type MapCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MapCountOutputType
     */
    select?: MapCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * MapCountOutputType without action
   */
  export type MapCountOutputTypeCountLobbiesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: LobbyWhereInput
  }


  /**
   * Models
   */

  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _avg: UserAvgAggregateOutputType | null
    _sum: UserSumAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserAvgAggregateOutputType = {
    creditBalance: number | null
    purchasedShipCount: number | null
    lobbiesCreatedCount: number | null
    kickCount: number | null
  }

  export type UserSumAggregateOutputType = {
    creditBalance: number | null
    purchasedShipCount: number | null
    lobbiesCreatedCount: number | null
    kickCount: number | null
  }

  export type UserMinAggregateOutputType = {
    id: string | null
    email: string | null
    username: string | null
    creditBalance: number | null
    purchasedShipCount: number | null
    lobbiesCreatedCount: number | null
    kickCount: number | null
    kickTimeoutUntil: Date | null
    tutorialCompleted: boolean | null
    tutorialPath: string | null
    createdAt: Date | null
  }

  export type UserMaxAggregateOutputType = {
    id: string | null
    email: string | null
    username: string | null
    creditBalance: number | null
    purchasedShipCount: number | null
    lobbiesCreatedCount: number | null
    kickCount: number | null
    kickTimeoutUntil: Date | null
    tutorialCompleted: boolean | null
    tutorialPath: string | null
    createdAt: Date | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    email: number
    username: number
    creditBalance: number
    purchasedShipCount: number
    lobbiesCreatedCount: number
    kickCount: number
    kickTimeoutUntil: number
    tutorialCompleted: number
    tutorialPath: number
    createdAt: number
    _all: number
  }


  export type UserAvgAggregateInputType = {
    creditBalance?: true
    purchasedShipCount?: true
    lobbiesCreatedCount?: true
    kickCount?: true
  }

  export type UserSumAggregateInputType = {
    creditBalance?: true
    purchasedShipCount?: true
    lobbiesCreatedCount?: true
    kickCount?: true
  }

  export type UserMinAggregateInputType = {
    id?: true
    email?: true
    username?: true
    creditBalance?: true
    purchasedShipCount?: true
    lobbiesCreatedCount?: true
    kickCount?: true
    kickTimeoutUntil?: true
    tutorialCompleted?: true
    tutorialPath?: true
    createdAt?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    email?: true
    username?: true
    creditBalance?: true
    purchasedShipCount?: true
    lobbiesCreatedCount?: true
    kickCount?: true
    kickTimeoutUntil?: true
    tutorialCompleted?: true
    tutorialPath?: true
    createdAt?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    email?: true
    username?: true
    creditBalance?: true
    purchasedShipCount?: true
    lobbiesCreatedCount?: true
    kickCount?: true
    kickTimeoutUntil?: true
    tutorialCompleted?: true
    tutorialPath?: true
    createdAt?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: UserAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: UserSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _avg?: UserAvgAggregateInputType
    _sum?: UserSumAggregateInputType
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    id: string
    email: string
    username: string | null
    creditBalance: number
    purchasedShipCount: number
    lobbiesCreatedCount: number
    kickCount: number
    kickTimeoutUntil: Date | null
    tutorialCompleted: boolean
    tutorialPath: string | null
    createdAt: Date
    _count: UserCountAggregateOutputType | null
    _avg: UserAvgAggregateOutputType | null
    _sum: UserSumAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    username?: boolean
    creditBalance?: boolean
    purchasedShipCount?: boolean
    lobbiesCreatedCount?: boolean
    kickCount?: boolean
    kickTimeoutUntil?: boolean
    tutorialCompleted?: boolean
    tutorialPath?: boolean
    createdAt?: boolean
    ships?: boolean | User$shipsArgs<ExtArgs>
    lobbiesCreated?: boolean | User$lobbiesCreatedArgs<ExtArgs>
    lobbiesJoined?: boolean | User$lobbiesJoinedArgs<ExtArgs>
    lobbiesReserved?: boolean | User$lobbiesReservedArgs<ExtArgs>
    gamesAsPlayer1?: boolean | User$gamesAsPlayer1Args<ExtArgs>
    gamesAsPlayer2?: boolean | User$gamesAsPlayer2Args<ExtArgs>
    fleets?: boolean | User$fleetsArgs<ExtArgs>
    stats?: boolean | User$statsArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    username?: boolean
    creditBalance?: boolean
    purchasedShipCount?: boolean
    lobbiesCreatedCount?: boolean
    kickCount?: boolean
    kickTimeoutUntil?: boolean
    tutorialCompleted?: boolean
    tutorialPath?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    username?: boolean
    creditBalance?: boolean
    purchasedShipCount?: boolean
    lobbiesCreatedCount?: boolean
    kickCount?: boolean
    kickTimeoutUntil?: boolean
    tutorialCompleted?: boolean
    tutorialPath?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    id?: boolean
    email?: boolean
    username?: boolean
    creditBalance?: boolean
    purchasedShipCount?: boolean
    lobbiesCreatedCount?: boolean
    kickCount?: boolean
    kickTimeoutUntil?: boolean
    tutorialCompleted?: boolean
    tutorialPath?: boolean
    createdAt?: boolean
  }

  export type UserOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "email" | "username" | "creditBalance" | "purchasedShipCount" | "lobbiesCreatedCount" | "kickCount" | "kickTimeoutUntil" | "tutorialCompleted" | "tutorialPath" | "createdAt", ExtArgs["result"]["user"]>
  export type UserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    ships?: boolean | User$shipsArgs<ExtArgs>
    lobbiesCreated?: boolean | User$lobbiesCreatedArgs<ExtArgs>
    lobbiesJoined?: boolean | User$lobbiesJoinedArgs<ExtArgs>
    lobbiesReserved?: boolean | User$lobbiesReservedArgs<ExtArgs>
    gamesAsPlayer1?: boolean | User$gamesAsPlayer1Args<ExtArgs>
    gamesAsPlayer2?: boolean | User$gamesAsPlayer2Args<ExtArgs>
    fleets?: boolean | User$fleetsArgs<ExtArgs>
    stats?: boolean | User$statsArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type UserIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type UserIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "User"
    objects: {
      ships: Prisma.$ShipPayload<ExtArgs>[]
      lobbiesCreated: Prisma.$LobbyPayload<ExtArgs>[]
      lobbiesJoined: Prisma.$LobbyPayload<ExtArgs>[]
      lobbiesReserved: Prisma.$LobbyPayload<ExtArgs>[]
      gamesAsPlayer1: Prisma.$GamePayload<ExtArgs>[]
      gamesAsPlayer2: Prisma.$GamePayload<ExtArgs>[]
      fleets: Prisma.$FleetPayload<ExtArgs>[]
      stats: Prisma.$PlayerStatsPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      email: string
      username: string | null
      creditBalance: number
      purchasedShipCount: number
      lobbiesCreatedCount: number
      kickCount: number
      kickTimeoutUntil: Date | null
      tutorialCompleted: boolean
      tutorialPath: string | null
      createdAt: Date
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = $Result.GetResult<Prisma.$UserPayload, S>

  type UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserFindUniqueArgs>(args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(args: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserFindFirstArgs>(args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userWithIdOnly = await prisma.user.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserFindManyArgs>(args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
     */
    create<T extends UserCreateArgs>(args: SelectSubset<T, UserCreateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserCreateManyArgs>(args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {UserCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `id`
     * const userWithIdOnly = await prisma.user.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserCreateManyAndReturnArgs>(args?: SelectSubset<T, UserCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
     */
    delete<T extends UserDeleteArgs>(args: SelectSubset<T, UserDeleteArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserUpdateArgs>(args: SelectSubset<T, UserUpdateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserDeleteManyArgs>(args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserUpdateManyArgs>(args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users and returns the data updated in the database.
     * @param {UserUpdateManyAndReturnArgs} args - Arguments to update many Users.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Users and only return the `id`
     * const userWithIdOnly = await prisma.user.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UserUpdateManyAndReturnArgs>(args: SelectSubset<T, UserUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends UserUpsertArgs>(args: SelectSubset<T, UserUpsertArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    ships<T extends User$shipsArgs<ExtArgs> = {}>(args?: Subset<T, User$shipsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ShipPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    lobbiesCreated<T extends User$lobbiesCreatedArgs<ExtArgs> = {}>(args?: Subset<T, User$lobbiesCreatedArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LobbyPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    lobbiesJoined<T extends User$lobbiesJoinedArgs<ExtArgs> = {}>(args?: Subset<T, User$lobbiesJoinedArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LobbyPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    lobbiesReserved<T extends User$lobbiesReservedArgs<ExtArgs> = {}>(args?: Subset<T, User$lobbiesReservedArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LobbyPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    gamesAsPlayer1<T extends User$gamesAsPlayer1Args<ExtArgs> = {}>(args?: Subset<T, User$gamesAsPlayer1Args<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GamePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    gamesAsPlayer2<T extends User$gamesAsPlayer2Args<ExtArgs> = {}>(args?: Subset<T, User$gamesAsPlayer2Args<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GamePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    fleets<T extends User$fleetsArgs<ExtArgs> = {}>(args?: Subset<T, User$fleetsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FleetPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    stats<T extends User$statsArgs<ExtArgs> = {}>(args?: Subset<T, User$statsArgs<ExtArgs>>): Prisma__PlayerStatsClient<$Result.GetResult<Prisma.$PlayerStatsPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the User model
   */
  interface UserFieldRefs {
    readonly id: FieldRef<"User", 'String'>
    readonly email: FieldRef<"User", 'String'>
    readonly username: FieldRef<"User", 'String'>
    readonly creditBalance: FieldRef<"User", 'Int'>
    readonly purchasedShipCount: FieldRef<"User", 'Int'>
    readonly lobbiesCreatedCount: FieldRef<"User", 'Int'>
    readonly kickCount: FieldRef<"User", 'Int'>
    readonly kickTimeoutUntil: FieldRef<"User", 'DateTime'>
    readonly tutorialCompleted: FieldRef<"User", 'Boolean'>
    readonly tutorialPath: FieldRef<"User", 'String'>
    readonly createdAt: FieldRef<"User", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }

  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User createManyAndReturn
   */
  export type UserCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User updateManyAndReturn
   */
  export type UserUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to delete.
     */
    limit?: number
  }

  /**
   * User.ships
   */
  export type User$shipsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Ship
     */
    select?: ShipSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Ship
     */
    omit?: ShipOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ShipInclude<ExtArgs> | null
    where?: ShipWhereInput
    orderBy?: ShipOrderByWithRelationInput | ShipOrderByWithRelationInput[]
    cursor?: ShipWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ShipScalarFieldEnum | ShipScalarFieldEnum[]
  }

  /**
   * User.lobbiesCreated
   */
  export type User$lobbiesCreatedArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Lobby
     */
    select?: LobbySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Lobby
     */
    omit?: LobbyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LobbyInclude<ExtArgs> | null
    where?: LobbyWhereInput
    orderBy?: LobbyOrderByWithRelationInput | LobbyOrderByWithRelationInput[]
    cursor?: LobbyWhereUniqueInput
    take?: number
    skip?: number
    distinct?: LobbyScalarFieldEnum | LobbyScalarFieldEnum[]
  }

  /**
   * User.lobbiesJoined
   */
  export type User$lobbiesJoinedArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Lobby
     */
    select?: LobbySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Lobby
     */
    omit?: LobbyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LobbyInclude<ExtArgs> | null
    where?: LobbyWhereInput
    orderBy?: LobbyOrderByWithRelationInput | LobbyOrderByWithRelationInput[]
    cursor?: LobbyWhereUniqueInput
    take?: number
    skip?: number
    distinct?: LobbyScalarFieldEnum | LobbyScalarFieldEnum[]
  }

  /**
   * User.lobbiesReserved
   */
  export type User$lobbiesReservedArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Lobby
     */
    select?: LobbySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Lobby
     */
    omit?: LobbyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LobbyInclude<ExtArgs> | null
    where?: LobbyWhereInput
    orderBy?: LobbyOrderByWithRelationInput | LobbyOrderByWithRelationInput[]
    cursor?: LobbyWhereUniqueInput
    take?: number
    skip?: number
    distinct?: LobbyScalarFieldEnum | LobbyScalarFieldEnum[]
  }

  /**
   * User.gamesAsPlayer1
   */
  export type User$gamesAsPlayer1Args<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Game
     */
    select?: GameSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Game
     */
    omit?: GameOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameInclude<ExtArgs> | null
    where?: GameWhereInput
    orderBy?: GameOrderByWithRelationInput | GameOrderByWithRelationInput[]
    cursor?: GameWhereUniqueInput
    take?: number
    skip?: number
    distinct?: GameScalarFieldEnum | GameScalarFieldEnum[]
  }

  /**
   * User.gamesAsPlayer2
   */
  export type User$gamesAsPlayer2Args<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Game
     */
    select?: GameSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Game
     */
    omit?: GameOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameInclude<ExtArgs> | null
    where?: GameWhereInput
    orderBy?: GameOrderByWithRelationInput | GameOrderByWithRelationInput[]
    cursor?: GameWhereUniqueInput
    take?: number
    skip?: number
    distinct?: GameScalarFieldEnum | GameScalarFieldEnum[]
  }

  /**
   * User.fleets
   */
  export type User$fleetsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Fleet
     */
    select?: FleetSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Fleet
     */
    omit?: FleetOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FleetInclude<ExtArgs> | null
    where?: FleetWhereInput
    orderBy?: FleetOrderByWithRelationInput | FleetOrderByWithRelationInput[]
    cursor?: FleetWhereUniqueInput
    take?: number
    skip?: number
    distinct?: FleetScalarFieldEnum | FleetScalarFieldEnum[]
  }

  /**
   * User.stats
   */
  export type User$statsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlayerStats
     */
    select?: PlayerStatsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PlayerStats
     */
    omit?: PlayerStatsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlayerStatsInclude<ExtArgs> | null
    where?: PlayerStatsWhereInput
  }

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
  }


  /**
   * Model Ship
   */

  export type AggregateShip = {
    _count: ShipCountAggregateOutputType | null
    _avg: ShipAvgAggregateOutputType | null
    _sum: ShipSumAggregateOutputType | null
    _min: ShipMinAggregateOutputType | null
    _max: ShipMaxAggregateOutputType | null
  }

  export type ShipAvgAggregateOutputType = {
    id: number | null
    cost: number | null
    costsVersion: number | null
    modifiedCount: number | null
    shipsDestroyed: number | null
  }

  export type ShipSumAggregateOutputType = {
    id: number | null
    cost: number | null
    costsVersion: number | null
    modifiedCount: number | null
    shipsDestroyed: number | null
  }

  export type ShipMinAggregateOutputType = {
    id: number | null
    ownerId: string | null
    name: string | null
    cost: number | null
    costsVersion: number | null
    isFree: boolean | null
    modifiedCount: number | null
    shiny: boolean | null
    constructed: boolean | null
    inFleet: boolean | null
    destroyed: boolean | null
    shipsDestroyed: number | null
    destroyedAt: Date | null
    createdAt: Date | null
  }

  export type ShipMaxAggregateOutputType = {
    id: number | null
    ownerId: string | null
    name: string | null
    cost: number | null
    costsVersion: number | null
    isFree: boolean | null
    modifiedCount: number | null
    shiny: boolean | null
    constructed: boolean | null
    inFleet: boolean | null
    destroyed: boolean | null
    shipsDestroyed: number | null
    destroyedAt: Date | null
    createdAt: Date | null
  }

  export type ShipCountAggregateOutputType = {
    id: number
    ownerId: number
    name: number
    equipment: number
    traits: number
    cost: number
    costsVersion: number
    isFree: number
    modifiedCount: number
    shiny: number
    constructed: number
    inFleet: number
    destroyed: number
    shipsDestroyed: number
    destroyedAt: number
    createdAt: number
    _all: number
  }


  export type ShipAvgAggregateInputType = {
    id?: true
    cost?: true
    costsVersion?: true
    modifiedCount?: true
    shipsDestroyed?: true
  }

  export type ShipSumAggregateInputType = {
    id?: true
    cost?: true
    costsVersion?: true
    modifiedCount?: true
    shipsDestroyed?: true
  }

  export type ShipMinAggregateInputType = {
    id?: true
    ownerId?: true
    name?: true
    cost?: true
    costsVersion?: true
    isFree?: true
    modifiedCount?: true
    shiny?: true
    constructed?: true
    inFleet?: true
    destroyed?: true
    shipsDestroyed?: true
    destroyedAt?: true
    createdAt?: true
  }

  export type ShipMaxAggregateInputType = {
    id?: true
    ownerId?: true
    name?: true
    cost?: true
    costsVersion?: true
    isFree?: true
    modifiedCount?: true
    shiny?: true
    constructed?: true
    inFleet?: true
    destroyed?: true
    shipsDestroyed?: true
    destroyedAt?: true
    createdAt?: true
  }

  export type ShipCountAggregateInputType = {
    id?: true
    ownerId?: true
    name?: true
    equipment?: true
    traits?: true
    cost?: true
    costsVersion?: true
    isFree?: true
    modifiedCount?: true
    shiny?: true
    constructed?: true
    inFleet?: true
    destroyed?: true
    shipsDestroyed?: true
    destroyedAt?: true
    createdAt?: true
    _all?: true
  }

  export type ShipAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Ship to aggregate.
     */
    where?: ShipWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Ships to fetch.
     */
    orderBy?: ShipOrderByWithRelationInput | ShipOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ShipWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Ships from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Ships.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Ships
    **/
    _count?: true | ShipCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ShipAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ShipSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ShipMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ShipMaxAggregateInputType
  }

  export type GetShipAggregateType<T extends ShipAggregateArgs> = {
        [P in keyof T & keyof AggregateShip]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateShip[P]>
      : GetScalarType<T[P], AggregateShip[P]>
  }




  export type ShipGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ShipWhereInput
    orderBy?: ShipOrderByWithAggregationInput | ShipOrderByWithAggregationInput[]
    by: ShipScalarFieldEnum[] | ShipScalarFieldEnum
    having?: ShipScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ShipCountAggregateInputType | true
    _avg?: ShipAvgAggregateInputType
    _sum?: ShipSumAggregateInputType
    _min?: ShipMinAggregateInputType
    _max?: ShipMaxAggregateInputType
  }

  export type ShipGroupByOutputType = {
    id: number
    ownerId: string
    name: string
    equipment: JsonValue
    traits: JsonValue
    cost: number
    costsVersion: number
    isFree: boolean
    modifiedCount: number
    shiny: boolean
    constructed: boolean
    inFleet: boolean
    destroyed: boolean
    shipsDestroyed: number
    destroyedAt: Date | null
    createdAt: Date
    _count: ShipCountAggregateOutputType | null
    _avg: ShipAvgAggregateOutputType | null
    _sum: ShipSumAggregateOutputType | null
    _min: ShipMinAggregateOutputType | null
    _max: ShipMaxAggregateOutputType | null
  }

  type GetShipGroupByPayload<T extends ShipGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ShipGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ShipGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ShipGroupByOutputType[P]>
            : GetScalarType<T[P], ShipGroupByOutputType[P]>
        }
      >
    >


  export type ShipSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    ownerId?: boolean
    name?: boolean
    equipment?: boolean
    traits?: boolean
    cost?: boolean
    costsVersion?: boolean
    isFree?: boolean
    modifiedCount?: boolean
    shiny?: boolean
    constructed?: boolean
    inFleet?: boolean
    destroyed?: boolean
    shipsDestroyed?: boolean
    destroyedAt?: boolean
    createdAt?: boolean
    owner?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["ship"]>

  export type ShipSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    ownerId?: boolean
    name?: boolean
    equipment?: boolean
    traits?: boolean
    cost?: boolean
    costsVersion?: boolean
    isFree?: boolean
    modifiedCount?: boolean
    shiny?: boolean
    constructed?: boolean
    inFleet?: boolean
    destroyed?: boolean
    shipsDestroyed?: boolean
    destroyedAt?: boolean
    createdAt?: boolean
    owner?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["ship"]>

  export type ShipSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    ownerId?: boolean
    name?: boolean
    equipment?: boolean
    traits?: boolean
    cost?: boolean
    costsVersion?: boolean
    isFree?: boolean
    modifiedCount?: boolean
    shiny?: boolean
    constructed?: boolean
    inFleet?: boolean
    destroyed?: boolean
    shipsDestroyed?: boolean
    destroyedAt?: boolean
    createdAt?: boolean
    owner?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["ship"]>

  export type ShipSelectScalar = {
    id?: boolean
    ownerId?: boolean
    name?: boolean
    equipment?: boolean
    traits?: boolean
    cost?: boolean
    costsVersion?: boolean
    isFree?: boolean
    modifiedCount?: boolean
    shiny?: boolean
    constructed?: boolean
    inFleet?: boolean
    destroyed?: boolean
    shipsDestroyed?: boolean
    destroyedAt?: boolean
    createdAt?: boolean
  }

  export type ShipOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "ownerId" | "name" | "equipment" | "traits" | "cost" | "costsVersion" | "isFree" | "modifiedCount" | "shiny" | "constructed" | "inFleet" | "destroyed" | "shipsDestroyed" | "destroyedAt" | "createdAt", ExtArgs["result"]["ship"]>
  export type ShipInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    owner?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type ShipIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    owner?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type ShipIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    owner?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $ShipPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Ship"
    objects: {
      owner: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      ownerId: string
      name: string
      equipment: Prisma.JsonValue
      traits: Prisma.JsonValue
      cost: number
      costsVersion: number
      isFree: boolean
      modifiedCount: number
      shiny: boolean
      constructed: boolean
      inFleet: boolean
      destroyed: boolean
      shipsDestroyed: number
      destroyedAt: Date | null
      createdAt: Date
    }, ExtArgs["result"]["ship"]>
    composites: {}
  }

  type ShipGetPayload<S extends boolean | null | undefined | ShipDefaultArgs> = $Result.GetResult<Prisma.$ShipPayload, S>

  type ShipCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ShipFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ShipCountAggregateInputType | true
    }

  export interface ShipDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Ship'], meta: { name: 'Ship' } }
    /**
     * Find zero or one Ship that matches the filter.
     * @param {ShipFindUniqueArgs} args - Arguments to find a Ship
     * @example
     * // Get one Ship
     * const ship = await prisma.ship.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ShipFindUniqueArgs>(args: SelectSubset<T, ShipFindUniqueArgs<ExtArgs>>): Prisma__ShipClient<$Result.GetResult<Prisma.$ShipPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Ship that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ShipFindUniqueOrThrowArgs} args - Arguments to find a Ship
     * @example
     * // Get one Ship
     * const ship = await prisma.ship.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ShipFindUniqueOrThrowArgs>(args: SelectSubset<T, ShipFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ShipClient<$Result.GetResult<Prisma.$ShipPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Ship that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ShipFindFirstArgs} args - Arguments to find a Ship
     * @example
     * // Get one Ship
     * const ship = await prisma.ship.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ShipFindFirstArgs>(args?: SelectSubset<T, ShipFindFirstArgs<ExtArgs>>): Prisma__ShipClient<$Result.GetResult<Prisma.$ShipPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Ship that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ShipFindFirstOrThrowArgs} args - Arguments to find a Ship
     * @example
     * // Get one Ship
     * const ship = await prisma.ship.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ShipFindFirstOrThrowArgs>(args?: SelectSubset<T, ShipFindFirstOrThrowArgs<ExtArgs>>): Prisma__ShipClient<$Result.GetResult<Prisma.$ShipPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Ships that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ShipFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Ships
     * const ships = await prisma.ship.findMany()
     * 
     * // Get first 10 Ships
     * const ships = await prisma.ship.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const shipWithIdOnly = await prisma.ship.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ShipFindManyArgs>(args?: SelectSubset<T, ShipFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ShipPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Ship.
     * @param {ShipCreateArgs} args - Arguments to create a Ship.
     * @example
     * // Create one Ship
     * const Ship = await prisma.ship.create({
     *   data: {
     *     // ... data to create a Ship
     *   }
     * })
     * 
     */
    create<T extends ShipCreateArgs>(args: SelectSubset<T, ShipCreateArgs<ExtArgs>>): Prisma__ShipClient<$Result.GetResult<Prisma.$ShipPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Ships.
     * @param {ShipCreateManyArgs} args - Arguments to create many Ships.
     * @example
     * // Create many Ships
     * const ship = await prisma.ship.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ShipCreateManyArgs>(args?: SelectSubset<T, ShipCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Ships and returns the data saved in the database.
     * @param {ShipCreateManyAndReturnArgs} args - Arguments to create many Ships.
     * @example
     * // Create many Ships
     * const ship = await prisma.ship.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Ships and only return the `id`
     * const shipWithIdOnly = await prisma.ship.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ShipCreateManyAndReturnArgs>(args?: SelectSubset<T, ShipCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ShipPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Ship.
     * @param {ShipDeleteArgs} args - Arguments to delete one Ship.
     * @example
     * // Delete one Ship
     * const Ship = await prisma.ship.delete({
     *   where: {
     *     // ... filter to delete one Ship
     *   }
     * })
     * 
     */
    delete<T extends ShipDeleteArgs>(args: SelectSubset<T, ShipDeleteArgs<ExtArgs>>): Prisma__ShipClient<$Result.GetResult<Prisma.$ShipPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Ship.
     * @param {ShipUpdateArgs} args - Arguments to update one Ship.
     * @example
     * // Update one Ship
     * const ship = await prisma.ship.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ShipUpdateArgs>(args: SelectSubset<T, ShipUpdateArgs<ExtArgs>>): Prisma__ShipClient<$Result.GetResult<Prisma.$ShipPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Ships.
     * @param {ShipDeleteManyArgs} args - Arguments to filter Ships to delete.
     * @example
     * // Delete a few Ships
     * const { count } = await prisma.ship.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ShipDeleteManyArgs>(args?: SelectSubset<T, ShipDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Ships.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ShipUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Ships
     * const ship = await prisma.ship.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ShipUpdateManyArgs>(args: SelectSubset<T, ShipUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Ships and returns the data updated in the database.
     * @param {ShipUpdateManyAndReturnArgs} args - Arguments to update many Ships.
     * @example
     * // Update many Ships
     * const ship = await prisma.ship.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Ships and only return the `id`
     * const shipWithIdOnly = await prisma.ship.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ShipUpdateManyAndReturnArgs>(args: SelectSubset<T, ShipUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ShipPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Ship.
     * @param {ShipUpsertArgs} args - Arguments to update or create a Ship.
     * @example
     * // Update or create a Ship
     * const ship = await prisma.ship.upsert({
     *   create: {
     *     // ... data to create a Ship
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Ship we want to update
     *   }
     * })
     */
    upsert<T extends ShipUpsertArgs>(args: SelectSubset<T, ShipUpsertArgs<ExtArgs>>): Prisma__ShipClient<$Result.GetResult<Prisma.$ShipPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Ships.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ShipCountArgs} args - Arguments to filter Ships to count.
     * @example
     * // Count the number of Ships
     * const count = await prisma.ship.count({
     *   where: {
     *     // ... the filter for the Ships we want to count
     *   }
     * })
    **/
    count<T extends ShipCountArgs>(
      args?: Subset<T, ShipCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ShipCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Ship.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ShipAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ShipAggregateArgs>(args: Subset<T, ShipAggregateArgs>): Prisma.PrismaPromise<GetShipAggregateType<T>>

    /**
     * Group by Ship.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ShipGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ShipGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ShipGroupByArgs['orderBy'] }
        : { orderBy?: ShipGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ShipGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetShipGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Ship model
   */
  readonly fields: ShipFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Ship.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ShipClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    owner<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Ship model
   */
  interface ShipFieldRefs {
    readonly id: FieldRef<"Ship", 'Int'>
    readonly ownerId: FieldRef<"Ship", 'String'>
    readonly name: FieldRef<"Ship", 'String'>
    readonly equipment: FieldRef<"Ship", 'Json'>
    readonly traits: FieldRef<"Ship", 'Json'>
    readonly cost: FieldRef<"Ship", 'Int'>
    readonly costsVersion: FieldRef<"Ship", 'Int'>
    readonly isFree: FieldRef<"Ship", 'Boolean'>
    readonly modifiedCount: FieldRef<"Ship", 'Int'>
    readonly shiny: FieldRef<"Ship", 'Boolean'>
    readonly constructed: FieldRef<"Ship", 'Boolean'>
    readonly inFleet: FieldRef<"Ship", 'Boolean'>
    readonly destroyed: FieldRef<"Ship", 'Boolean'>
    readonly shipsDestroyed: FieldRef<"Ship", 'Int'>
    readonly destroyedAt: FieldRef<"Ship", 'DateTime'>
    readonly createdAt: FieldRef<"Ship", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Ship findUnique
   */
  export type ShipFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Ship
     */
    select?: ShipSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Ship
     */
    omit?: ShipOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ShipInclude<ExtArgs> | null
    /**
     * Filter, which Ship to fetch.
     */
    where: ShipWhereUniqueInput
  }

  /**
   * Ship findUniqueOrThrow
   */
  export type ShipFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Ship
     */
    select?: ShipSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Ship
     */
    omit?: ShipOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ShipInclude<ExtArgs> | null
    /**
     * Filter, which Ship to fetch.
     */
    where: ShipWhereUniqueInput
  }

  /**
   * Ship findFirst
   */
  export type ShipFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Ship
     */
    select?: ShipSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Ship
     */
    omit?: ShipOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ShipInclude<ExtArgs> | null
    /**
     * Filter, which Ship to fetch.
     */
    where?: ShipWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Ships to fetch.
     */
    orderBy?: ShipOrderByWithRelationInput | ShipOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Ships.
     */
    cursor?: ShipWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Ships from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Ships.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Ships.
     */
    distinct?: ShipScalarFieldEnum | ShipScalarFieldEnum[]
  }

  /**
   * Ship findFirstOrThrow
   */
  export type ShipFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Ship
     */
    select?: ShipSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Ship
     */
    omit?: ShipOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ShipInclude<ExtArgs> | null
    /**
     * Filter, which Ship to fetch.
     */
    where?: ShipWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Ships to fetch.
     */
    orderBy?: ShipOrderByWithRelationInput | ShipOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Ships.
     */
    cursor?: ShipWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Ships from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Ships.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Ships.
     */
    distinct?: ShipScalarFieldEnum | ShipScalarFieldEnum[]
  }

  /**
   * Ship findMany
   */
  export type ShipFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Ship
     */
    select?: ShipSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Ship
     */
    omit?: ShipOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ShipInclude<ExtArgs> | null
    /**
     * Filter, which Ships to fetch.
     */
    where?: ShipWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Ships to fetch.
     */
    orderBy?: ShipOrderByWithRelationInput | ShipOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Ships.
     */
    cursor?: ShipWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Ships from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Ships.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Ships.
     */
    distinct?: ShipScalarFieldEnum | ShipScalarFieldEnum[]
  }

  /**
   * Ship create
   */
  export type ShipCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Ship
     */
    select?: ShipSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Ship
     */
    omit?: ShipOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ShipInclude<ExtArgs> | null
    /**
     * The data needed to create a Ship.
     */
    data: XOR<ShipCreateInput, ShipUncheckedCreateInput>
  }

  /**
   * Ship createMany
   */
  export type ShipCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Ships.
     */
    data: ShipCreateManyInput | ShipCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Ship createManyAndReturn
   */
  export type ShipCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Ship
     */
    select?: ShipSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Ship
     */
    omit?: ShipOmit<ExtArgs> | null
    /**
     * The data used to create many Ships.
     */
    data: ShipCreateManyInput | ShipCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ShipIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Ship update
   */
  export type ShipUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Ship
     */
    select?: ShipSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Ship
     */
    omit?: ShipOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ShipInclude<ExtArgs> | null
    /**
     * The data needed to update a Ship.
     */
    data: XOR<ShipUpdateInput, ShipUncheckedUpdateInput>
    /**
     * Choose, which Ship to update.
     */
    where: ShipWhereUniqueInput
  }

  /**
   * Ship updateMany
   */
  export type ShipUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Ships.
     */
    data: XOR<ShipUpdateManyMutationInput, ShipUncheckedUpdateManyInput>
    /**
     * Filter which Ships to update
     */
    where?: ShipWhereInput
    /**
     * Limit how many Ships to update.
     */
    limit?: number
  }

  /**
   * Ship updateManyAndReturn
   */
  export type ShipUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Ship
     */
    select?: ShipSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Ship
     */
    omit?: ShipOmit<ExtArgs> | null
    /**
     * The data used to update Ships.
     */
    data: XOR<ShipUpdateManyMutationInput, ShipUncheckedUpdateManyInput>
    /**
     * Filter which Ships to update
     */
    where?: ShipWhereInput
    /**
     * Limit how many Ships to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ShipIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Ship upsert
   */
  export type ShipUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Ship
     */
    select?: ShipSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Ship
     */
    omit?: ShipOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ShipInclude<ExtArgs> | null
    /**
     * The filter to search for the Ship to update in case it exists.
     */
    where: ShipWhereUniqueInput
    /**
     * In case the Ship found by the `where` argument doesn't exist, create a new Ship with this data.
     */
    create: XOR<ShipCreateInput, ShipUncheckedCreateInput>
    /**
     * In case the Ship was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ShipUpdateInput, ShipUncheckedUpdateInput>
  }

  /**
   * Ship delete
   */
  export type ShipDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Ship
     */
    select?: ShipSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Ship
     */
    omit?: ShipOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ShipInclude<ExtArgs> | null
    /**
     * Filter which Ship to delete.
     */
    where: ShipWhereUniqueInput
  }

  /**
   * Ship deleteMany
   */
  export type ShipDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Ships to delete
     */
    where?: ShipWhereInput
    /**
     * Limit how many Ships to delete.
     */
    limit?: number
  }

  /**
   * Ship without action
   */
  export type ShipDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Ship
     */
    select?: ShipSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Ship
     */
    omit?: ShipOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ShipInclude<ExtArgs> | null
  }


  /**
   * Model Fleet
   */

  export type AggregateFleet = {
    _count: FleetCountAggregateOutputType | null
    _avg: FleetAvgAggregateOutputType | null
    _sum: FleetSumAggregateOutputType | null
    _min: FleetMinAggregateOutputType | null
    _max: FleetMaxAggregateOutputType | null
  }

  export type FleetAvgAggregateOutputType = {
    id: number | null
    lobbyId: number | null
    shipIds: number | null
    totalCost: number | null
  }

  export type FleetSumAggregateOutputType = {
    id: number | null
    lobbyId: number | null
    shipIds: number[]
    totalCost: number | null
  }

  export type FleetMinAggregateOutputType = {
    id: number | null
    ownerId: string | null
    lobbyId: number | null
    totalCost: number | null
    isComplete: boolean | null
    createdAt: Date | null
  }

  export type FleetMaxAggregateOutputType = {
    id: number | null
    ownerId: string | null
    lobbyId: number | null
    totalCost: number | null
    isComplete: boolean | null
    createdAt: Date | null
  }

  export type FleetCountAggregateOutputType = {
    id: number
    ownerId: number
    lobbyId: number
    shipIds: number
    totalCost: number
    isComplete: number
    startingPositions: number
    createdAt: number
    _all: number
  }


  export type FleetAvgAggregateInputType = {
    id?: true
    lobbyId?: true
    shipIds?: true
    totalCost?: true
  }

  export type FleetSumAggregateInputType = {
    id?: true
    lobbyId?: true
    shipIds?: true
    totalCost?: true
  }

  export type FleetMinAggregateInputType = {
    id?: true
    ownerId?: true
    lobbyId?: true
    totalCost?: true
    isComplete?: true
    createdAt?: true
  }

  export type FleetMaxAggregateInputType = {
    id?: true
    ownerId?: true
    lobbyId?: true
    totalCost?: true
    isComplete?: true
    createdAt?: true
  }

  export type FleetCountAggregateInputType = {
    id?: true
    ownerId?: true
    lobbyId?: true
    shipIds?: true
    totalCost?: true
    isComplete?: true
    startingPositions?: true
    createdAt?: true
    _all?: true
  }

  export type FleetAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Fleet to aggregate.
     */
    where?: FleetWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Fleets to fetch.
     */
    orderBy?: FleetOrderByWithRelationInput | FleetOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: FleetWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Fleets from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Fleets.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Fleets
    **/
    _count?: true | FleetCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: FleetAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: FleetSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: FleetMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: FleetMaxAggregateInputType
  }

  export type GetFleetAggregateType<T extends FleetAggregateArgs> = {
        [P in keyof T & keyof AggregateFleet]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateFleet[P]>
      : GetScalarType<T[P], AggregateFleet[P]>
  }




  export type FleetGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FleetWhereInput
    orderBy?: FleetOrderByWithAggregationInput | FleetOrderByWithAggregationInput[]
    by: FleetScalarFieldEnum[] | FleetScalarFieldEnum
    having?: FleetScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: FleetCountAggregateInputType | true
    _avg?: FleetAvgAggregateInputType
    _sum?: FleetSumAggregateInputType
    _min?: FleetMinAggregateInputType
    _max?: FleetMaxAggregateInputType
  }

  export type FleetGroupByOutputType = {
    id: number
    ownerId: string
    lobbyId: number
    shipIds: number[]
    totalCost: number
    isComplete: boolean
    startingPositions: JsonValue | null
    createdAt: Date
    _count: FleetCountAggregateOutputType | null
    _avg: FleetAvgAggregateOutputType | null
    _sum: FleetSumAggregateOutputType | null
    _min: FleetMinAggregateOutputType | null
    _max: FleetMaxAggregateOutputType | null
  }

  type GetFleetGroupByPayload<T extends FleetGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<FleetGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof FleetGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], FleetGroupByOutputType[P]>
            : GetScalarType<T[P], FleetGroupByOutputType[P]>
        }
      >
    >


  export type FleetSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    ownerId?: boolean
    lobbyId?: boolean
    shipIds?: boolean
    totalCost?: boolean
    isComplete?: boolean
    startingPositions?: boolean
    createdAt?: boolean
    owner?: boolean | UserDefaultArgs<ExtArgs>
    lobby?: boolean | LobbyDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["fleet"]>

  export type FleetSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    ownerId?: boolean
    lobbyId?: boolean
    shipIds?: boolean
    totalCost?: boolean
    isComplete?: boolean
    startingPositions?: boolean
    createdAt?: boolean
    owner?: boolean | UserDefaultArgs<ExtArgs>
    lobby?: boolean | LobbyDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["fleet"]>

  export type FleetSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    ownerId?: boolean
    lobbyId?: boolean
    shipIds?: boolean
    totalCost?: boolean
    isComplete?: boolean
    startingPositions?: boolean
    createdAt?: boolean
    owner?: boolean | UserDefaultArgs<ExtArgs>
    lobby?: boolean | LobbyDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["fleet"]>

  export type FleetSelectScalar = {
    id?: boolean
    ownerId?: boolean
    lobbyId?: boolean
    shipIds?: boolean
    totalCost?: boolean
    isComplete?: boolean
    startingPositions?: boolean
    createdAt?: boolean
  }

  export type FleetOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "ownerId" | "lobbyId" | "shipIds" | "totalCost" | "isComplete" | "startingPositions" | "createdAt", ExtArgs["result"]["fleet"]>
  export type FleetInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    owner?: boolean | UserDefaultArgs<ExtArgs>
    lobby?: boolean | LobbyDefaultArgs<ExtArgs>
  }
  export type FleetIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    owner?: boolean | UserDefaultArgs<ExtArgs>
    lobby?: boolean | LobbyDefaultArgs<ExtArgs>
  }
  export type FleetIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    owner?: boolean | UserDefaultArgs<ExtArgs>
    lobby?: boolean | LobbyDefaultArgs<ExtArgs>
  }

  export type $FleetPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Fleet"
    objects: {
      owner: Prisma.$UserPayload<ExtArgs>
      lobby: Prisma.$LobbyPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      ownerId: string
      lobbyId: number
      shipIds: number[]
      totalCost: number
      isComplete: boolean
      startingPositions: Prisma.JsonValue | null
      createdAt: Date
    }, ExtArgs["result"]["fleet"]>
    composites: {}
  }

  type FleetGetPayload<S extends boolean | null | undefined | FleetDefaultArgs> = $Result.GetResult<Prisma.$FleetPayload, S>

  type FleetCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<FleetFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: FleetCountAggregateInputType | true
    }

  export interface FleetDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Fleet'], meta: { name: 'Fleet' } }
    /**
     * Find zero or one Fleet that matches the filter.
     * @param {FleetFindUniqueArgs} args - Arguments to find a Fleet
     * @example
     * // Get one Fleet
     * const fleet = await prisma.fleet.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends FleetFindUniqueArgs>(args: SelectSubset<T, FleetFindUniqueArgs<ExtArgs>>): Prisma__FleetClient<$Result.GetResult<Prisma.$FleetPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Fleet that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {FleetFindUniqueOrThrowArgs} args - Arguments to find a Fleet
     * @example
     * // Get one Fleet
     * const fleet = await prisma.fleet.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends FleetFindUniqueOrThrowArgs>(args: SelectSubset<T, FleetFindUniqueOrThrowArgs<ExtArgs>>): Prisma__FleetClient<$Result.GetResult<Prisma.$FleetPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Fleet that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FleetFindFirstArgs} args - Arguments to find a Fleet
     * @example
     * // Get one Fleet
     * const fleet = await prisma.fleet.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends FleetFindFirstArgs>(args?: SelectSubset<T, FleetFindFirstArgs<ExtArgs>>): Prisma__FleetClient<$Result.GetResult<Prisma.$FleetPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Fleet that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FleetFindFirstOrThrowArgs} args - Arguments to find a Fleet
     * @example
     * // Get one Fleet
     * const fleet = await prisma.fleet.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends FleetFindFirstOrThrowArgs>(args?: SelectSubset<T, FleetFindFirstOrThrowArgs<ExtArgs>>): Prisma__FleetClient<$Result.GetResult<Prisma.$FleetPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Fleets that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FleetFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Fleets
     * const fleets = await prisma.fleet.findMany()
     * 
     * // Get first 10 Fleets
     * const fleets = await prisma.fleet.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const fleetWithIdOnly = await prisma.fleet.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends FleetFindManyArgs>(args?: SelectSubset<T, FleetFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FleetPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Fleet.
     * @param {FleetCreateArgs} args - Arguments to create a Fleet.
     * @example
     * // Create one Fleet
     * const Fleet = await prisma.fleet.create({
     *   data: {
     *     // ... data to create a Fleet
     *   }
     * })
     * 
     */
    create<T extends FleetCreateArgs>(args: SelectSubset<T, FleetCreateArgs<ExtArgs>>): Prisma__FleetClient<$Result.GetResult<Prisma.$FleetPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Fleets.
     * @param {FleetCreateManyArgs} args - Arguments to create many Fleets.
     * @example
     * // Create many Fleets
     * const fleet = await prisma.fleet.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends FleetCreateManyArgs>(args?: SelectSubset<T, FleetCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Fleets and returns the data saved in the database.
     * @param {FleetCreateManyAndReturnArgs} args - Arguments to create many Fleets.
     * @example
     * // Create many Fleets
     * const fleet = await prisma.fleet.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Fleets and only return the `id`
     * const fleetWithIdOnly = await prisma.fleet.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends FleetCreateManyAndReturnArgs>(args?: SelectSubset<T, FleetCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FleetPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Fleet.
     * @param {FleetDeleteArgs} args - Arguments to delete one Fleet.
     * @example
     * // Delete one Fleet
     * const Fleet = await prisma.fleet.delete({
     *   where: {
     *     // ... filter to delete one Fleet
     *   }
     * })
     * 
     */
    delete<T extends FleetDeleteArgs>(args: SelectSubset<T, FleetDeleteArgs<ExtArgs>>): Prisma__FleetClient<$Result.GetResult<Prisma.$FleetPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Fleet.
     * @param {FleetUpdateArgs} args - Arguments to update one Fleet.
     * @example
     * // Update one Fleet
     * const fleet = await prisma.fleet.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends FleetUpdateArgs>(args: SelectSubset<T, FleetUpdateArgs<ExtArgs>>): Prisma__FleetClient<$Result.GetResult<Prisma.$FleetPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Fleets.
     * @param {FleetDeleteManyArgs} args - Arguments to filter Fleets to delete.
     * @example
     * // Delete a few Fleets
     * const { count } = await prisma.fleet.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends FleetDeleteManyArgs>(args?: SelectSubset<T, FleetDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Fleets.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FleetUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Fleets
     * const fleet = await prisma.fleet.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends FleetUpdateManyArgs>(args: SelectSubset<T, FleetUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Fleets and returns the data updated in the database.
     * @param {FleetUpdateManyAndReturnArgs} args - Arguments to update many Fleets.
     * @example
     * // Update many Fleets
     * const fleet = await prisma.fleet.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Fleets and only return the `id`
     * const fleetWithIdOnly = await prisma.fleet.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends FleetUpdateManyAndReturnArgs>(args: SelectSubset<T, FleetUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FleetPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Fleet.
     * @param {FleetUpsertArgs} args - Arguments to update or create a Fleet.
     * @example
     * // Update or create a Fleet
     * const fleet = await prisma.fleet.upsert({
     *   create: {
     *     // ... data to create a Fleet
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Fleet we want to update
     *   }
     * })
     */
    upsert<T extends FleetUpsertArgs>(args: SelectSubset<T, FleetUpsertArgs<ExtArgs>>): Prisma__FleetClient<$Result.GetResult<Prisma.$FleetPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Fleets.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FleetCountArgs} args - Arguments to filter Fleets to count.
     * @example
     * // Count the number of Fleets
     * const count = await prisma.fleet.count({
     *   where: {
     *     // ... the filter for the Fleets we want to count
     *   }
     * })
    **/
    count<T extends FleetCountArgs>(
      args?: Subset<T, FleetCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], FleetCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Fleet.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FleetAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends FleetAggregateArgs>(args: Subset<T, FleetAggregateArgs>): Prisma.PrismaPromise<GetFleetAggregateType<T>>

    /**
     * Group by Fleet.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FleetGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends FleetGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: FleetGroupByArgs['orderBy'] }
        : { orderBy?: FleetGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, FleetGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetFleetGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Fleet model
   */
  readonly fields: FleetFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Fleet.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__FleetClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    owner<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    lobby<T extends LobbyDefaultArgs<ExtArgs> = {}>(args?: Subset<T, LobbyDefaultArgs<ExtArgs>>): Prisma__LobbyClient<$Result.GetResult<Prisma.$LobbyPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Fleet model
   */
  interface FleetFieldRefs {
    readonly id: FieldRef<"Fleet", 'Int'>
    readonly ownerId: FieldRef<"Fleet", 'String'>
    readonly lobbyId: FieldRef<"Fleet", 'Int'>
    readonly shipIds: FieldRef<"Fleet", 'Int[]'>
    readonly totalCost: FieldRef<"Fleet", 'Int'>
    readonly isComplete: FieldRef<"Fleet", 'Boolean'>
    readonly startingPositions: FieldRef<"Fleet", 'Json'>
    readonly createdAt: FieldRef<"Fleet", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Fleet findUnique
   */
  export type FleetFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Fleet
     */
    select?: FleetSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Fleet
     */
    omit?: FleetOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FleetInclude<ExtArgs> | null
    /**
     * Filter, which Fleet to fetch.
     */
    where: FleetWhereUniqueInput
  }

  /**
   * Fleet findUniqueOrThrow
   */
  export type FleetFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Fleet
     */
    select?: FleetSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Fleet
     */
    omit?: FleetOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FleetInclude<ExtArgs> | null
    /**
     * Filter, which Fleet to fetch.
     */
    where: FleetWhereUniqueInput
  }

  /**
   * Fleet findFirst
   */
  export type FleetFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Fleet
     */
    select?: FleetSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Fleet
     */
    omit?: FleetOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FleetInclude<ExtArgs> | null
    /**
     * Filter, which Fleet to fetch.
     */
    where?: FleetWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Fleets to fetch.
     */
    orderBy?: FleetOrderByWithRelationInput | FleetOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Fleets.
     */
    cursor?: FleetWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Fleets from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Fleets.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Fleets.
     */
    distinct?: FleetScalarFieldEnum | FleetScalarFieldEnum[]
  }

  /**
   * Fleet findFirstOrThrow
   */
  export type FleetFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Fleet
     */
    select?: FleetSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Fleet
     */
    omit?: FleetOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FleetInclude<ExtArgs> | null
    /**
     * Filter, which Fleet to fetch.
     */
    where?: FleetWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Fleets to fetch.
     */
    orderBy?: FleetOrderByWithRelationInput | FleetOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Fleets.
     */
    cursor?: FleetWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Fleets from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Fleets.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Fleets.
     */
    distinct?: FleetScalarFieldEnum | FleetScalarFieldEnum[]
  }

  /**
   * Fleet findMany
   */
  export type FleetFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Fleet
     */
    select?: FleetSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Fleet
     */
    omit?: FleetOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FleetInclude<ExtArgs> | null
    /**
     * Filter, which Fleets to fetch.
     */
    where?: FleetWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Fleets to fetch.
     */
    orderBy?: FleetOrderByWithRelationInput | FleetOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Fleets.
     */
    cursor?: FleetWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Fleets from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Fleets.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Fleets.
     */
    distinct?: FleetScalarFieldEnum | FleetScalarFieldEnum[]
  }

  /**
   * Fleet create
   */
  export type FleetCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Fleet
     */
    select?: FleetSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Fleet
     */
    omit?: FleetOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FleetInclude<ExtArgs> | null
    /**
     * The data needed to create a Fleet.
     */
    data: XOR<FleetCreateInput, FleetUncheckedCreateInput>
  }

  /**
   * Fleet createMany
   */
  export type FleetCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Fleets.
     */
    data: FleetCreateManyInput | FleetCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Fleet createManyAndReturn
   */
  export type FleetCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Fleet
     */
    select?: FleetSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Fleet
     */
    omit?: FleetOmit<ExtArgs> | null
    /**
     * The data used to create many Fleets.
     */
    data: FleetCreateManyInput | FleetCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FleetIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Fleet update
   */
  export type FleetUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Fleet
     */
    select?: FleetSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Fleet
     */
    omit?: FleetOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FleetInclude<ExtArgs> | null
    /**
     * The data needed to update a Fleet.
     */
    data: XOR<FleetUpdateInput, FleetUncheckedUpdateInput>
    /**
     * Choose, which Fleet to update.
     */
    where: FleetWhereUniqueInput
  }

  /**
   * Fleet updateMany
   */
  export type FleetUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Fleets.
     */
    data: XOR<FleetUpdateManyMutationInput, FleetUncheckedUpdateManyInput>
    /**
     * Filter which Fleets to update
     */
    where?: FleetWhereInput
    /**
     * Limit how many Fleets to update.
     */
    limit?: number
  }

  /**
   * Fleet updateManyAndReturn
   */
  export type FleetUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Fleet
     */
    select?: FleetSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Fleet
     */
    omit?: FleetOmit<ExtArgs> | null
    /**
     * The data used to update Fleets.
     */
    data: XOR<FleetUpdateManyMutationInput, FleetUncheckedUpdateManyInput>
    /**
     * Filter which Fleets to update
     */
    where?: FleetWhereInput
    /**
     * Limit how many Fleets to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FleetIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Fleet upsert
   */
  export type FleetUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Fleet
     */
    select?: FleetSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Fleet
     */
    omit?: FleetOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FleetInclude<ExtArgs> | null
    /**
     * The filter to search for the Fleet to update in case it exists.
     */
    where: FleetWhereUniqueInput
    /**
     * In case the Fleet found by the `where` argument doesn't exist, create a new Fleet with this data.
     */
    create: XOR<FleetCreateInput, FleetUncheckedCreateInput>
    /**
     * In case the Fleet was found with the provided `where` argument, update it with this data.
     */
    update: XOR<FleetUpdateInput, FleetUncheckedUpdateInput>
  }

  /**
   * Fleet delete
   */
  export type FleetDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Fleet
     */
    select?: FleetSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Fleet
     */
    omit?: FleetOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FleetInclude<ExtArgs> | null
    /**
     * Filter which Fleet to delete.
     */
    where: FleetWhereUniqueInput
  }

  /**
   * Fleet deleteMany
   */
  export type FleetDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Fleets to delete
     */
    where?: FleetWhereInput
    /**
     * Limit how many Fleets to delete.
     */
    limit?: number
  }

  /**
   * Fleet without action
   */
  export type FleetDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Fleet
     */
    select?: FleetSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Fleet
     */
    omit?: FleetOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FleetInclude<ExtArgs> | null
  }


  /**
   * Model Lobby
   */

  export type AggregateLobby = {
    _count: LobbyCountAggregateOutputType | null
    _avg: LobbyAvgAggregateOutputType | null
    _sum: LobbySumAggregateOutputType | null
    _min: LobbyMinAggregateOutputType | null
    _max: LobbyMaxAggregateOutputType | null
  }

  export type LobbyAvgAggregateOutputType = {
    id: number | null
    mapId: number | null
    costLimit: number | null
    turnTimeSeconds: number | null
    maxScore: number | null
  }

  export type LobbySumAggregateOutputType = {
    id: number | null
    mapId: number | null
    costLimit: number | null
    turnTimeSeconds: number | null
    maxScore: number | null
  }

  export type LobbyMinAggregateOutputType = {
    id: number | null
    creatorId: string | null
    joinerId: string | null
    reservedJoinerId: string | null
    mapId: number | null
    status: $Enums.LobbyStatus | null
    costLimit: number | null
    turnTimeSeconds: number | null
    maxScore: number | null
    creatorGoesFirst: boolean | null
    isAiGame: boolean | null
    aiDifficulty: string | null
    createdAt: Date | null
    joinedAt: Date | null
    joinerFleetSetAt: Date | null
  }

  export type LobbyMaxAggregateOutputType = {
    id: number | null
    creatorId: string | null
    joinerId: string | null
    reservedJoinerId: string | null
    mapId: number | null
    status: $Enums.LobbyStatus | null
    costLimit: number | null
    turnTimeSeconds: number | null
    maxScore: number | null
    creatorGoesFirst: boolean | null
    isAiGame: boolean | null
    aiDifficulty: string | null
    createdAt: Date | null
    joinedAt: Date | null
    joinerFleetSetAt: Date | null
  }

  export type LobbyCountAggregateOutputType = {
    id: number
    creatorId: number
    joinerId: number
    reservedJoinerId: number
    mapId: number
    status: number
    costLimit: number
    turnTimeSeconds: number
    maxScore: number
    creatorGoesFirst: number
    isAiGame: number
    aiDifficulty: number
    createdAt: number
    joinedAt: number
    joinerFleetSetAt: number
    _all: number
  }


  export type LobbyAvgAggregateInputType = {
    id?: true
    mapId?: true
    costLimit?: true
    turnTimeSeconds?: true
    maxScore?: true
  }

  export type LobbySumAggregateInputType = {
    id?: true
    mapId?: true
    costLimit?: true
    turnTimeSeconds?: true
    maxScore?: true
  }

  export type LobbyMinAggregateInputType = {
    id?: true
    creatorId?: true
    joinerId?: true
    reservedJoinerId?: true
    mapId?: true
    status?: true
    costLimit?: true
    turnTimeSeconds?: true
    maxScore?: true
    creatorGoesFirst?: true
    isAiGame?: true
    aiDifficulty?: true
    createdAt?: true
    joinedAt?: true
    joinerFleetSetAt?: true
  }

  export type LobbyMaxAggregateInputType = {
    id?: true
    creatorId?: true
    joinerId?: true
    reservedJoinerId?: true
    mapId?: true
    status?: true
    costLimit?: true
    turnTimeSeconds?: true
    maxScore?: true
    creatorGoesFirst?: true
    isAiGame?: true
    aiDifficulty?: true
    createdAt?: true
    joinedAt?: true
    joinerFleetSetAt?: true
  }

  export type LobbyCountAggregateInputType = {
    id?: true
    creatorId?: true
    joinerId?: true
    reservedJoinerId?: true
    mapId?: true
    status?: true
    costLimit?: true
    turnTimeSeconds?: true
    maxScore?: true
    creatorGoesFirst?: true
    isAiGame?: true
    aiDifficulty?: true
    createdAt?: true
    joinedAt?: true
    joinerFleetSetAt?: true
    _all?: true
  }

  export type LobbyAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Lobby to aggregate.
     */
    where?: LobbyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Lobbies to fetch.
     */
    orderBy?: LobbyOrderByWithRelationInput | LobbyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: LobbyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Lobbies from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Lobbies.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Lobbies
    **/
    _count?: true | LobbyCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: LobbyAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: LobbySumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: LobbyMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: LobbyMaxAggregateInputType
  }

  export type GetLobbyAggregateType<T extends LobbyAggregateArgs> = {
        [P in keyof T & keyof AggregateLobby]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateLobby[P]>
      : GetScalarType<T[P], AggregateLobby[P]>
  }




  export type LobbyGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: LobbyWhereInput
    orderBy?: LobbyOrderByWithAggregationInput | LobbyOrderByWithAggregationInput[]
    by: LobbyScalarFieldEnum[] | LobbyScalarFieldEnum
    having?: LobbyScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: LobbyCountAggregateInputType | true
    _avg?: LobbyAvgAggregateInputType
    _sum?: LobbySumAggregateInputType
    _min?: LobbyMinAggregateInputType
    _max?: LobbyMaxAggregateInputType
  }

  export type LobbyGroupByOutputType = {
    id: number
    creatorId: string
    joinerId: string | null
    reservedJoinerId: string | null
    mapId: number | null
    status: $Enums.LobbyStatus
    costLimit: number
    turnTimeSeconds: number
    maxScore: number
    creatorGoesFirst: boolean | null
    isAiGame: boolean
    aiDifficulty: string | null
    createdAt: Date
    joinedAt: Date | null
    joinerFleetSetAt: Date | null
    _count: LobbyCountAggregateOutputType | null
    _avg: LobbyAvgAggregateOutputType | null
    _sum: LobbySumAggregateOutputType | null
    _min: LobbyMinAggregateOutputType | null
    _max: LobbyMaxAggregateOutputType | null
  }

  type GetLobbyGroupByPayload<T extends LobbyGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<LobbyGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof LobbyGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], LobbyGroupByOutputType[P]>
            : GetScalarType<T[P], LobbyGroupByOutputType[P]>
        }
      >
    >


  export type LobbySelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    creatorId?: boolean
    joinerId?: boolean
    reservedJoinerId?: boolean
    mapId?: boolean
    status?: boolean
    costLimit?: boolean
    turnTimeSeconds?: boolean
    maxScore?: boolean
    creatorGoesFirst?: boolean
    isAiGame?: boolean
    aiDifficulty?: boolean
    createdAt?: boolean
    joinedAt?: boolean
    joinerFleetSetAt?: boolean
    creator?: boolean | UserDefaultArgs<ExtArgs>
    joiner?: boolean | Lobby$joinerArgs<ExtArgs>
    reservedJoiner?: boolean | Lobby$reservedJoinerArgs<ExtArgs>
    map?: boolean | Lobby$mapArgs<ExtArgs>
    fleets?: boolean | Lobby$fleetsArgs<ExtArgs>
    game?: boolean | Lobby$gameArgs<ExtArgs>
    _count?: boolean | LobbyCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["lobby"]>

  export type LobbySelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    creatorId?: boolean
    joinerId?: boolean
    reservedJoinerId?: boolean
    mapId?: boolean
    status?: boolean
    costLimit?: boolean
    turnTimeSeconds?: boolean
    maxScore?: boolean
    creatorGoesFirst?: boolean
    isAiGame?: boolean
    aiDifficulty?: boolean
    createdAt?: boolean
    joinedAt?: boolean
    joinerFleetSetAt?: boolean
    creator?: boolean | UserDefaultArgs<ExtArgs>
    joiner?: boolean | Lobby$joinerArgs<ExtArgs>
    reservedJoiner?: boolean | Lobby$reservedJoinerArgs<ExtArgs>
    map?: boolean | Lobby$mapArgs<ExtArgs>
  }, ExtArgs["result"]["lobby"]>

  export type LobbySelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    creatorId?: boolean
    joinerId?: boolean
    reservedJoinerId?: boolean
    mapId?: boolean
    status?: boolean
    costLimit?: boolean
    turnTimeSeconds?: boolean
    maxScore?: boolean
    creatorGoesFirst?: boolean
    isAiGame?: boolean
    aiDifficulty?: boolean
    createdAt?: boolean
    joinedAt?: boolean
    joinerFleetSetAt?: boolean
    creator?: boolean | UserDefaultArgs<ExtArgs>
    joiner?: boolean | Lobby$joinerArgs<ExtArgs>
    reservedJoiner?: boolean | Lobby$reservedJoinerArgs<ExtArgs>
    map?: boolean | Lobby$mapArgs<ExtArgs>
  }, ExtArgs["result"]["lobby"]>

  export type LobbySelectScalar = {
    id?: boolean
    creatorId?: boolean
    joinerId?: boolean
    reservedJoinerId?: boolean
    mapId?: boolean
    status?: boolean
    costLimit?: boolean
    turnTimeSeconds?: boolean
    maxScore?: boolean
    creatorGoesFirst?: boolean
    isAiGame?: boolean
    aiDifficulty?: boolean
    createdAt?: boolean
    joinedAt?: boolean
    joinerFleetSetAt?: boolean
  }

  export type LobbyOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "creatorId" | "joinerId" | "reservedJoinerId" | "mapId" | "status" | "costLimit" | "turnTimeSeconds" | "maxScore" | "creatorGoesFirst" | "isAiGame" | "aiDifficulty" | "createdAt" | "joinedAt" | "joinerFleetSetAt", ExtArgs["result"]["lobby"]>
  export type LobbyInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    creator?: boolean | UserDefaultArgs<ExtArgs>
    joiner?: boolean | Lobby$joinerArgs<ExtArgs>
    reservedJoiner?: boolean | Lobby$reservedJoinerArgs<ExtArgs>
    map?: boolean | Lobby$mapArgs<ExtArgs>
    fleets?: boolean | Lobby$fleetsArgs<ExtArgs>
    game?: boolean | Lobby$gameArgs<ExtArgs>
    _count?: boolean | LobbyCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type LobbyIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    creator?: boolean | UserDefaultArgs<ExtArgs>
    joiner?: boolean | Lobby$joinerArgs<ExtArgs>
    reservedJoiner?: boolean | Lobby$reservedJoinerArgs<ExtArgs>
    map?: boolean | Lobby$mapArgs<ExtArgs>
  }
  export type LobbyIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    creator?: boolean | UserDefaultArgs<ExtArgs>
    joiner?: boolean | Lobby$joinerArgs<ExtArgs>
    reservedJoiner?: boolean | Lobby$reservedJoinerArgs<ExtArgs>
    map?: boolean | Lobby$mapArgs<ExtArgs>
  }

  export type $LobbyPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Lobby"
    objects: {
      creator: Prisma.$UserPayload<ExtArgs>
      joiner: Prisma.$UserPayload<ExtArgs> | null
      reservedJoiner: Prisma.$UserPayload<ExtArgs> | null
      map: Prisma.$MapPayload<ExtArgs> | null
      fleets: Prisma.$FleetPayload<ExtArgs>[]
      game: Prisma.$GamePayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      creatorId: string
      joinerId: string | null
      reservedJoinerId: string | null
      mapId: number | null
      status: $Enums.LobbyStatus
      costLimit: number
      turnTimeSeconds: number
      maxScore: number
      creatorGoesFirst: boolean | null
      isAiGame: boolean
      aiDifficulty: string | null
      createdAt: Date
      joinedAt: Date | null
      joinerFleetSetAt: Date | null
    }, ExtArgs["result"]["lobby"]>
    composites: {}
  }

  type LobbyGetPayload<S extends boolean | null | undefined | LobbyDefaultArgs> = $Result.GetResult<Prisma.$LobbyPayload, S>

  type LobbyCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<LobbyFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: LobbyCountAggregateInputType | true
    }

  export interface LobbyDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Lobby'], meta: { name: 'Lobby' } }
    /**
     * Find zero or one Lobby that matches the filter.
     * @param {LobbyFindUniqueArgs} args - Arguments to find a Lobby
     * @example
     * // Get one Lobby
     * const lobby = await prisma.lobby.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends LobbyFindUniqueArgs>(args: SelectSubset<T, LobbyFindUniqueArgs<ExtArgs>>): Prisma__LobbyClient<$Result.GetResult<Prisma.$LobbyPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Lobby that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {LobbyFindUniqueOrThrowArgs} args - Arguments to find a Lobby
     * @example
     * // Get one Lobby
     * const lobby = await prisma.lobby.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends LobbyFindUniqueOrThrowArgs>(args: SelectSubset<T, LobbyFindUniqueOrThrowArgs<ExtArgs>>): Prisma__LobbyClient<$Result.GetResult<Prisma.$LobbyPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Lobby that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LobbyFindFirstArgs} args - Arguments to find a Lobby
     * @example
     * // Get one Lobby
     * const lobby = await prisma.lobby.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends LobbyFindFirstArgs>(args?: SelectSubset<T, LobbyFindFirstArgs<ExtArgs>>): Prisma__LobbyClient<$Result.GetResult<Prisma.$LobbyPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Lobby that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LobbyFindFirstOrThrowArgs} args - Arguments to find a Lobby
     * @example
     * // Get one Lobby
     * const lobby = await prisma.lobby.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends LobbyFindFirstOrThrowArgs>(args?: SelectSubset<T, LobbyFindFirstOrThrowArgs<ExtArgs>>): Prisma__LobbyClient<$Result.GetResult<Prisma.$LobbyPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Lobbies that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LobbyFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Lobbies
     * const lobbies = await prisma.lobby.findMany()
     * 
     * // Get first 10 Lobbies
     * const lobbies = await prisma.lobby.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const lobbyWithIdOnly = await prisma.lobby.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends LobbyFindManyArgs>(args?: SelectSubset<T, LobbyFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LobbyPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Lobby.
     * @param {LobbyCreateArgs} args - Arguments to create a Lobby.
     * @example
     * // Create one Lobby
     * const Lobby = await prisma.lobby.create({
     *   data: {
     *     // ... data to create a Lobby
     *   }
     * })
     * 
     */
    create<T extends LobbyCreateArgs>(args: SelectSubset<T, LobbyCreateArgs<ExtArgs>>): Prisma__LobbyClient<$Result.GetResult<Prisma.$LobbyPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Lobbies.
     * @param {LobbyCreateManyArgs} args - Arguments to create many Lobbies.
     * @example
     * // Create many Lobbies
     * const lobby = await prisma.lobby.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends LobbyCreateManyArgs>(args?: SelectSubset<T, LobbyCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Lobbies and returns the data saved in the database.
     * @param {LobbyCreateManyAndReturnArgs} args - Arguments to create many Lobbies.
     * @example
     * // Create many Lobbies
     * const lobby = await prisma.lobby.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Lobbies and only return the `id`
     * const lobbyWithIdOnly = await prisma.lobby.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends LobbyCreateManyAndReturnArgs>(args?: SelectSubset<T, LobbyCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LobbyPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Lobby.
     * @param {LobbyDeleteArgs} args - Arguments to delete one Lobby.
     * @example
     * // Delete one Lobby
     * const Lobby = await prisma.lobby.delete({
     *   where: {
     *     // ... filter to delete one Lobby
     *   }
     * })
     * 
     */
    delete<T extends LobbyDeleteArgs>(args: SelectSubset<T, LobbyDeleteArgs<ExtArgs>>): Prisma__LobbyClient<$Result.GetResult<Prisma.$LobbyPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Lobby.
     * @param {LobbyUpdateArgs} args - Arguments to update one Lobby.
     * @example
     * // Update one Lobby
     * const lobby = await prisma.lobby.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends LobbyUpdateArgs>(args: SelectSubset<T, LobbyUpdateArgs<ExtArgs>>): Prisma__LobbyClient<$Result.GetResult<Prisma.$LobbyPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Lobbies.
     * @param {LobbyDeleteManyArgs} args - Arguments to filter Lobbies to delete.
     * @example
     * // Delete a few Lobbies
     * const { count } = await prisma.lobby.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends LobbyDeleteManyArgs>(args?: SelectSubset<T, LobbyDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Lobbies.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LobbyUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Lobbies
     * const lobby = await prisma.lobby.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends LobbyUpdateManyArgs>(args: SelectSubset<T, LobbyUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Lobbies and returns the data updated in the database.
     * @param {LobbyUpdateManyAndReturnArgs} args - Arguments to update many Lobbies.
     * @example
     * // Update many Lobbies
     * const lobby = await prisma.lobby.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Lobbies and only return the `id`
     * const lobbyWithIdOnly = await prisma.lobby.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends LobbyUpdateManyAndReturnArgs>(args: SelectSubset<T, LobbyUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LobbyPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Lobby.
     * @param {LobbyUpsertArgs} args - Arguments to update or create a Lobby.
     * @example
     * // Update or create a Lobby
     * const lobby = await prisma.lobby.upsert({
     *   create: {
     *     // ... data to create a Lobby
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Lobby we want to update
     *   }
     * })
     */
    upsert<T extends LobbyUpsertArgs>(args: SelectSubset<T, LobbyUpsertArgs<ExtArgs>>): Prisma__LobbyClient<$Result.GetResult<Prisma.$LobbyPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Lobbies.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LobbyCountArgs} args - Arguments to filter Lobbies to count.
     * @example
     * // Count the number of Lobbies
     * const count = await prisma.lobby.count({
     *   where: {
     *     // ... the filter for the Lobbies we want to count
     *   }
     * })
    **/
    count<T extends LobbyCountArgs>(
      args?: Subset<T, LobbyCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], LobbyCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Lobby.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LobbyAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends LobbyAggregateArgs>(args: Subset<T, LobbyAggregateArgs>): Prisma.PrismaPromise<GetLobbyAggregateType<T>>

    /**
     * Group by Lobby.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LobbyGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends LobbyGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: LobbyGroupByArgs['orderBy'] }
        : { orderBy?: LobbyGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, LobbyGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetLobbyGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Lobby model
   */
  readonly fields: LobbyFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Lobby.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__LobbyClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    creator<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    joiner<T extends Lobby$joinerArgs<ExtArgs> = {}>(args?: Subset<T, Lobby$joinerArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    reservedJoiner<T extends Lobby$reservedJoinerArgs<ExtArgs> = {}>(args?: Subset<T, Lobby$reservedJoinerArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    map<T extends Lobby$mapArgs<ExtArgs> = {}>(args?: Subset<T, Lobby$mapArgs<ExtArgs>>): Prisma__MapClient<$Result.GetResult<Prisma.$MapPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    fleets<T extends Lobby$fleetsArgs<ExtArgs> = {}>(args?: Subset<T, Lobby$fleetsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FleetPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    game<T extends Lobby$gameArgs<ExtArgs> = {}>(args?: Subset<T, Lobby$gameArgs<ExtArgs>>): Prisma__GameClient<$Result.GetResult<Prisma.$GamePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Lobby model
   */
  interface LobbyFieldRefs {
    readonly id: FieldRef<"Lobby", 'Int'>
    readonly creatorId: FieldRef<"Lobby", 'String'>
    readonly joinerId: FieldRef<"Lobby", 'String'>
    readonly reservedJoinerId: FieldRef<"Lobby", 'String'>
    readonly mapId: FieldRef<"Lobby", 'Int'>
    readonly status: FieldRef<"Lobby", 'LobbyStatus'>
    readonly costLimit: FieldRef<"Lobby", 'Int'>
    readonly turnTimeSeconds: FieldRef<"Lobby", 'Int'>
    readonly maxScore: FieldRef<"Lobby", 'Int'>
    readonly creatorGoesFirst: FieldRef<"Lobby", 'Boolean'>
    readonly isAiGame: FieldRef<"Lobby", 'Boolean'>
    readonly aiDifficulty: FieldRef<"Lobby", 'String'>
    readonly createdAt: FieldRef<"Lobby", 'DateTime'>
    readonly joinedAt: FieldRef<"Lobby", 'DateTime'>
    readonly joinerFleetSetAt: FieldRef<"Lobby", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Lobby findUnique
   */
  export type LobbyFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Lobby
     */
    select?: LobbySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Lobby
     */
    omit?: LobbyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LobbyInclude<ExtArgs> | null
    /**
     * Filter, which Lobby to fetch.
     */
    where: LobbyWhereUniqueInput
  }

  /**
   * Lobby findUniqueOrThrow
   */
  export type LobbyFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Lobby
     */
    select?: LobbySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Lobby
     */
    omit?: LobbyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LobbyInclude<ExtArgs> | null
    /**
     * Filter, which Lobby to fetch.
     */
    where: LobbyWhereUniqueInput
  }

  /**
   * Lobby findFirst
   */
  export type LobbyFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Lobby
     */
    select?: LobbySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Lobby
     */
    omit?: LobbyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LobbyInclude<ExtArgs> | null
    /**
     * Filter, which Lobby to fetch.
     */
    where?: LobbyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Lobbies to fetch.
     */
    orderBy?: LobbyOrderByWithRelationInput | LobbyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Lobbies.
     */
    cursor?: LobbyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Lobbies from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Lobbies.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Lobbies.
     */
    distinct?: LobbyScalarFieldEnum | LobbyScalarFieldEnum[]
  }

  /**
   * Lobby findFirstOrThrow
   */
  export type LobbyFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Lobby
     */
    select?: LobbySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Lobby
     */
    omit?: LobbyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LobbyInclude<ExtArgs> | null
    /**
     * Filter, which Lobby to fetch.
     */
    where?: LobbyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Lobbies to fetch.
     */
    orderBy?: LobbyOrderByWithRelationInput | LobbyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Lobbies.
     */
    cursor?: LobbyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Lobbies from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Lobbies.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Lobbies.
     */
    distinct?: LobbyScalarFieldEnum | LobbyScalarFieldEnum[]
  }

  /**
   * Lobby findMany
   */
  export type LobbyFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Lobby
     */
    select?: LobbySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Lobby
     */
    omit?: LobbyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LobbyInclude<ExtArgs> | null
    /**
     * Filter, which Lobbies to fetch.
     */
    where?: LobbyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Lobbies to fetch.
     */
    orderBy?: LobbyOrderByWithRelationInput | LobbyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Lobbies.
     */
    cursor?: LobbyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Lobbies from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Lobbies.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Lobbies.
     */
    distinct?: LobbyScalarFieldEnum | LobbyScalarFieldEnum[]
  }

  /**
   * Lobby create
   */
  export type LobbyCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Lobby
     */
    select?: LobbySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Lobby
     */
    omit?: LobbyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LobbyInclude<ExtArgs> | null
    /**
     * The data needed to create a Lobby.
     */
    data: XOR<LobbyCreateInput, LobbyUncheckedCreateInput>
  }

  /**
   * Lobby createMany
   */
  export type LobbyCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Lobbies.
     */
    data: LobbyCreateManyInput | LobbyCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Lobby createManyAndReturn
   */
  export type LobbyCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Lobby
     */
    select?: LobbySelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Lobby
     */
    omit?: LobbyOmit<ExtArgs> | null
    /**
     * The data used to create many Lobbies.
     */
    data: LobbyCreateManyInput | LobbyCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LobbyIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Lobby update
   */
  export type LobbyUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Lobby
     */
    select?: LobbySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Lobby
     */
    omit?: LobbyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LobbyInclude<ExtArgs> | null
    /**
     * The data needed to update a Lobby.
     */
    data: XOR<LobbyUpdateInput, LobbyUncheckedUpdateInput>
    /**
     * Choose, which Lobby to update.
     */
    where: LobbyWhereUniqueInput
  }

  /**
   * Lobby updateMany
   */
  export type LobbyUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Lobbies.
     */
    data: XOR<LobbyUpdateManyMutationInput, LobbyUncheckedUpdateManyInput>
    /**
     * Filter which Lobbies to update
     */
    where?: LobbyWhereInput
    /**
     * Limit how many Lobbies to update.
     */
    limit?: number
  }

  /**
   * Lobby updateManyAndReturn
   */
  export type LobbyUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Lobby
     */
    select?: LobbySelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Lobby
     */
    omit?: LobbyOmit<ExtArgs> | null
    /**
     * The data used to update Lobbies.
     */
    data: XOR<LobbyUpdateManyMutationInput, LobbyUncheckedUpdateManyInput>
    /**
     * Filter which Lobbies to update
     */
    where?: LobbyWhereInput
    /**
     * Limit how many Lobbies to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LobbyIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Lobby upsert
   */
  export type LobbyUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Lobby
     */
    select?: LobbySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Lobby
     */
    omit?: LobbyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LobbyInclude<ExtArgs> | null
    /**
     * The filter to search for the Lobby to update in case it exists.
     */
    where: LobbyWhereUniqueInput
    /**
     * In case the Lobby found by the `where` argument doesn't exist, create a new Lobby with this data.
     */
    create: XOR<LobbyCreateInput, LobbyUncheckedCreateInput>
    /**
     * In case the Lobby was found with the provided `where` argument, update it with this data.
     */
    update: XOR<LobbyUpdateInput, LobbyUncheckedUpdateInput>
  }

  /**
   * Lobby delete
   */
  export type LobbyDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Lobby
     */
    select?: LobbySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Lobby
     */
    omit?: LobbyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LobbyInclude<ExtArgs> | null
    /**
     * Filter which Lobby to delete.
     */
    where: LobbyWhereUniqueInput
  }

  /**
   * Lobby deleteMany
   */
  export type LobbyDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Lobbies to delete
     */
    where?: LobbyWhereInput
    /**
     * Limit how many Lobbies to delete.
     */
    limit?: number
  }

  /**
   * Lobby.joiner
   */
  export type Lobby$joinerArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * Lobby.reservedJoiner
   */
  export type Lobby$reservedJoinerArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * Lobby.map
   */
  export type Lobby$mapArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Map
     */
    select?: MapSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Map
     */
    omit?: MapOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MapInclude<ExtArgs> | null
    where?: MapWhereInput
  }

  /**
   * Lobby.fleets
   */
  export type Lobby$fleetsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Fleet
     */
    select?: FleetSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Fleet
     */
    omit?: FleetOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FleetInclude<ExtArgs> | null
    where?: FleetWhereInput
    orderBy?: FleetOrderByWithRelationInput | FleetOrderByWithRelationInput[]
    cursor?: FleetWhereUniqueInput
    take?: number
    skip?: number
    distinct?: FleetScalarFieldEnum | FleetScalarFieldEnum[]
  }

  /**
   * Lobby.game
   */
  export type Lobby$gameArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Game
     */
    select?: GameSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Game
     */
    omit?: GameOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameInclude<ExtArgs> | null
    where?: GameWhereInput
  }

  /**
   * Lobby without action
   */
  export type LobbyDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Lobby
     */
    select?: LobbySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Lobby
     */
    omit?: LobbyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LobbyInclude<ExtArgs> | null
  }


  /**
   * Model Game
   */

  export type AggregateGame = {
    _count: GameCountAggregateOutputType | null
    _avg: GameAvgAggregateOutputType | null
    _sum: GameSumAggregateOutputType | null
    _min: GameMinAggregateOutputType | null
    _max: GameMaxAggregateOutputType | null
  }

  export type GameAvgAggregateOutputType = {
    id: number | null
    lobbyId: number | null
    currentRound: number | null
  }

  export type GameSumAggregateOutputType = {
    id: number | null
    lobbyId: number | null
    currentRound: number | null
  }

  export type GameMinAggregateOutputType = {
    id: number | null
    lobbyId: number | null
    player1Id: string | null
    player2Id: string | null
    currentTurn: string | null
    currentRound: number | null
    phase: $Enums.GamePhase | null
    winnerId: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type GameMaxAggregateOutputType = {
    id: number | null
    lobbyId: number | null
    player1Id: string | null
    player2Id: string | null
    currentTurn: string | null
    currentRound: number | null
    phase: $Enums.GamePhase | null
    winnerId: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type GameCountAggregateOutputType = {
    id: number
    lobbyId: number
    player1Id: number
    player2Id: number
    state: number
    initialState: number
    currentTurn: number
    currentRound: number
    phase: number
    winnerId: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type GameAvgAggregateInputType = {
    id?: true
    lobbyId?: true
    currentRound?: true
  }

  export type GameSumAggregateInputType = {
    id?: true
    lobbyId?: true
    currentRound?: true
  }

  export type GameMinAggregateInputType = {
    id?: true
    lobbyId?: true
    player1Id?: true
    player2Id?: true
    currentTurn?: true
    currentRound?: true
    phase?: true
    winnerId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type GameMaxAggregateInputType = {
    id?: true
    lobbyId?: true
    player1Id?: true
    player2Id?: true
    currentTurn?: true
    currentRound?: true
    phase?: true
    winnerId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type GameCountAggregateInputType = {
    id?: true
    lobbyId?: true
    player1Id?: true
    player2Id?: true
    state?: true
    initialState?: true
    currentTurn?: true
    currentRound?: true
    phase?: true
    winnerId?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type GameAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Game to aggregate.
     */
    where?: GameWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Games to fetch.
     */
    orderBy?: GameOrderByWithRelationInput | GameOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: GameWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Games from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Games.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Games
    **/
    _count?: true | GameCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: GameAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: GameSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: GameMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: GameMaxAggregateInputType
  }

  export type GetGameAggregateType<T extends GameAggregateArgs> = {
        [P in keyof T & keyof AggregateGame]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateGame[P]>
      : GetScalarType<T[P], AggregateGame[P]>
  }




  export type GameGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: GameWhereInput
    orderBy?: GameOrderByWithAggregationInput | GameOrderByWithAggregationInput[]
    by: GameScalarFieldEnum[] | GameScalarFieldEnum
    having?: GameScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: GameCountAggregateInputType | true
    _avg?: GameAvgAggregateInputType
    _sum?: GameSumAggregateInputType
    _min?: GameMinAggregateInputType
    _max?: GameMaxAggregateInputType
  }

  export type GameGroupByOutputType = {
    id: number
    lobbyId: number
    player1Id: string
    player2Id: string
    state: JsonValue
    initialState: JsonValue | null
    currentTurn: string
    currentRound: number
    phase: $Enums.GamePhase
    winnerId: string | null
    createdAt: Date
    updatedAt: Date
    _count: GameCountAggregateOutputType | null
    _avg: GameAvgAggregateOutputType | null
    _sum: GameSumAggregateOutputType | null
    _min: GameMinAggregateOutputType | null
    _max: GameMaxAggregateOutputType | null
  }

  type GetGameGroupByPayload<T extends GameGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<GameGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof GameGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], GameGroupByOutputType[P]>
            : GetScalarType<T[P], GameGroupByOutputType[P]>
        }
      >
    >


  export type GameSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    lobbyId?: boolean
    player1Id?: boolean
    player2Id?: boolean
    state?: boolean
    initialState?: boolean
    currentTurn?: boolean
    currentRound?: boolean
    phase?: boolean
    winnerId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    lobby?: boolean | LobbyDefaultArgs<ExtArgs>
    player1?: boolean | UserDefaultArgs<ExtArgs>
    player2?: boolean | UserDefaultArgs<ExtArgs>
    turns?: boolean | Game$turnsArgs<ExtArgs>
    _count?: boolean | GameCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["game"]>

  export type GameSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    lobbyId?: boolean
    player1Id?: boolean
    player2Id?: boolean
    state?: boolean
    initialState?: boolean
    currentTurn?: boolean
    currentRound?: boolean
    phase?: boolean
    winnerId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    lobby?: boolean | LobbyDefaultArgs<ExtArgs>
    player1?: boolean | UserDefaultArgs<ExtArgs>
    player2?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["game"]>

  export type GameSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    lobbyId?: boolean
    player1Id?: boolean
    player2Id?: boolean
    state?: boolean
    initialState?: boolean
    currentTurn?: boolean
    currentRound?: boolean
    phase?: boolean
    winnerId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    lobby?: boolean | LobbyDefaultArgs<ExtArgs>
    player1?: boolean | UserDefaultArgs<ExtArgs>
    player2?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["game"]>

  export type GameSelectScalar = {
    id?: boolean
    lobbyId?: boolean
    player1Id?: boolean
    player2Id?: boolean
    state?: boolean
    initialState?: boolean
    currentTurn?: boolean
    currentRound?: boolean
    phase?: boolean
    winnerId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type GameOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "lobbyId" | "player1Id" | "player2Id" | "state" | "initialState" | "currentTurn" | "currentRound" | "phase" | "winnerId" | "createdAt" | "updatedAt", ExtArgs["result"]["game"]>
  export type GameInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    lobby?: boolean | LobbyDefaultArgs<ExtArgs>
    player1?: boolean | UserDefaultArgs<ExtArgs>
    player2?: boolean | UserDefaultArgs<ExtArgs>
    turns?: boolean | Game$turnsArgs<ExtArgs>
    _count?: boolean | GameCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type GameIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    lobby?: boolean | LobbyDefaultArgs<ExtArgs>
    player1?: boolean | UserDefaultArgs<ExtArgs>
    player2?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type GameIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    lobby?: boolean | LobbyDefaultArgs<ExtArgs>
    player1?: boolean | UserDefaultArgs<ExtArgs>
    player2?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $GamePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Game"
    objects: {
      lobby: Prisma.$LobbyPayload<ExtArgs>
      player1: Prisma.$UserPayload<ExtArgs>
      player2: Prisma.$UserPayload<ExtArgs>
      turns: Prisma.$GameTurnPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      lobbyId: number
      player1Id: string
      player2Id: string
      state: Prisma.JsonValue
      initialState: Prisma.JsonValue | null
      currentTurn: string
      currentRound: number
      phase: $Enums.GamePhase
      winnerId: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["game"]>
    composites: {}
  }

  type GameGetPayload<S extends boolean | null | undefined | GameDefaultArgs> = $Result.GetResult<Prisma.$GamePayload, S>

  type GameCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<GameFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: GameCountAggregateInputType | true
    }

  export interface GameDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Game'], meta: { name: 'Game' } }
    /**
     * Find zero or one Game that matches the filter.
     * @param {GameFindUniqueArgs} args - Arguments to find a Game
     * @example
     * // Get one Game
     * const game = await prisma.game.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends GameFindUniqueArgs>(args: SelectSubset<T, GameFindUniqueArgs<ExtArgs>>): Prisma__GameClient<$Result.GetResult<Prisma.$GamePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Game that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {GameFindUniqueOrThrowArgs} args - Arguments to find a Game
     * @example
     * // Get one Game
     * const game = await prisma.game.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends GameFindUniqueOrThrowArgs>(args: SelectSubset<T, GameFindUniqueOrThrowArgs<ExtArgs>>): Prisma__GameClient<$Result.GetResult<Prisma.$GamePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Game that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GameFindFirstArgs} args - Arguments to find a Game
     * @example
     * // Get one Game
     * const game = await prisma.game.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends GameFindFirstArgs>(args?: SelectSubset<T, GameFindFirstArgs<ExtArgs>>): Prisma__GameClient<$Result.GetResult<Prisma.$GamePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Game that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GameFindFirstOrThrowArgs} args - Arguments to find a Game
     * @example
     * // Get one Game
     * const game = await prisma.game.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends GameFindFirstOrThrowArgs>(args?: SelectSubset<T, GameFindFirstOrThrowArgs<ExtArgs>>): Prisma__GameClient<$Result.GetResult<Prisma.$GamePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Games that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GameFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Games
     * const games = await prisma.game.findMany()
     * 
     * // Get first 10 Games
     * const games = await prisma.game.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const gameWithIdOnly = await prisma.game.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends GameFindManyArgs>(args?: SelectSubset<T, GameFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GamePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Game.
     * @param {GameCreateArgs} args - Arguments to create a Game.
     * @example
     * // Create one Game
     * const Game = await prisma.game.create({
     *   data: {
     *     // ... data to create a Game
     *   }
     * })
     * 
     */
    create<T extends GameCreateArgs>(args: SelectSubset<T, GameCreateArgs<ExtArgs>>): Prisma__GameClient<$Result.GetResult<Prisma.$GamePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Games.
     * @param {GameCreateManyArgs} args - Arguments to create many Games.
     * @example
     * // Create many Games
     * const game = await prisma.game.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends GameCreateManyArgs>(args?: SelectSubset<T, GameCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Games and returns the data saved in the database.
     * @param {GameCreateManyAndReturnArgs} args - Arguments to create many Games.
     * @example
     * // Create many Games
     * const game = await prisma.game.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Games and only return the `id`
     * const gameWithIdOnly = await prisma.game.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends GameCreateManyAndReturnArgs>(args?: SelectSubset<T, GameCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GamePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Game.
     * @param {GameDeleteArgs} args - Arguments to delete one Game.
     * @example
     * // Delete one Game
     * const Game = await prisma.game.delete({
     *   where: {
     *     // ... filter to delete one Game
     *   }
     * })
     * 
     */
    delete<T extends GameDeleteArgs>(args: SelectSubset<T, GameDeleteArgs<ExtArgs>>): Prisma__GameClient<$Result.GetResult<Prisma.$GamePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Game.
     * @param {GameUpdateArgs} args - Arguments to update one Game.
     * @example
     * // Update one Game
     * const game = await prisma.game.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends GameUpdateArgs>(args: SelectSubset<T, GameUpdateArgs<ExtArgs>>): Prisma__GameClient<$Result.GetResult<Prisma.$GamePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Games.
     * @param {GameDeleteManyArgs} args - Arguments to filter Games to delete.
     * @example
     * // Delete a few Games
     * const { count } = await prisma.game.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends GameDeleteManyArgs>(args?: SelectSubset<T, GameDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Games.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GameUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Games
     * const game = await prisma.game.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends GameUpdateManyArgs>(args: SelectSubset<T, GameUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Games and returns the data updated in the database.
     * @param {GameUpdateManyAndReturnArgs} args - Arguments to update many Games.
     * @example
     * // Update many Games
     * const game = await prisma.game.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Games and only return the `id`
     * const gameWithIdOnly = await prisma.game.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends GameUpdateManyAndReturnArgs>(args: SelectSubset<T, GameUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GamePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Game.
     * @param {GameUpsertArgs} args - Arguments to update or create a Game.
     * @example
     * // Update or create a Game
     * const game = await prisma.game.upsert({
     *   create: {
     *     // ... data to create a Game
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Game we want to update
     *   }
     * })
     */
    upsert<T extends GameUpsertArgs>(args: SelectSubset<T, GameUpsertArgs<ExtArgs>>): Prisma__GameClient<$Result.GetResult<Prisma.$GamePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Games.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GameCountArgs} args - Arguments to filter Games to count.
     * @example
     * // Count the number of Games
     * const count = await prisma.game.count({
     *   where: {
     *     // ... the filter for the Games we want to count
     *   }
     * })
    **/
    count<T extends GameCountArgs>(
      args?: Subset<T, GameCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], GameCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Game.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GameAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends GameAggregateArgs>(args: Subset<T, GameAggregateArgs>): Prisma.PrismaPromise<GetGameAggregateType<T>>

    /**
     * Group by Game.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GameGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends GameGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: GameGroupByArgs['orderBy'] }
        : { orderBy?: GameGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, GameGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetGameGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Game model
   */
  readonly fields: GameFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Game.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__GameClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    lobby<T extends LobbyDefaultArgs<ExtArgs> = {}>(args?: Subset<T, LobbyDefaultArgs<ExtArgs>>): Prisma__LobbyClient<$Result.GetResult<Prisma.$LobbyPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    player1<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    player2<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    turns<T extends Game$turnsArgs<ExtArgs> = {}>(args?: Subset<T, Game$turnsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GameTurnPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Game model
   */
  interface GameFieldRefs {
    readonly id: FieldRef<"Game", 'Int'>
    readonly lobbyId: FieldRef<"Game", 'Int'>
    readonly player1Id: FieldRef<"Game", 'String'>
    readonly player2Id: FieldRef<"Game", 'String'>
    readonly state: FieldRef<"Game", 'Json'>
    readonly initialState: FieldRef<"Game", 'Json'>
    readonly currentTurn: FieldRef<"Game", 'String'>
    readonly currentRound: FieldRef<"Game", 'Int'>
    readonly phase: FieldRef<"Game", 'GamePhase'>
    readonly winnerId: FieldRef<"Game", 'String'>
    readonly createdAt: FieldRef<"Game", 'DateTime'>
    readonly updatedAt: FieldRef<"Game", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Game findUnique
   */
  export type GameFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Game
     */
    select?: GameSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Game
     */
    omit?: GameOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameInclude<ExtArgs> | null
    /**
     * Filter, which Game to fetch.
     */
    where: GameWhereUniqueInput
  }

  /**
   * Game findUniqueOrThrow
   */
  export type GameFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Game
     */
    select?: GameSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Game
     */
    omit?: GameOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameInclude<ExtArgs> | null
    /**
     * Filter, which Game to fetch.
     */
    where: GameWhereUniqueInput
  }

  /**
   * Game findFirst
   */
  export type GameFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Game
     */
    select?: GameSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Game
     */
    omit?: GameOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameInclude<ExtArgs> | null
    /**
     * Filter, which Game to fetch.
     */
    where?: GameWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Games to fetch.
     */
    orderBy?: GameOrderByWithRelationInput | GameOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Games.
     */
    cursor?: GameWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Games from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Games.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Games.
     */
    distinct?: GameScalarFieldEnum | GameScalarFieldEnum[]
  }

  /**
   * Game findFirstOrThrow
   */
  export type GameFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Game
     */
    select?: GameSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Game
     */
    omit?: GameOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameInclude<ExtArgs> | null
    /**
     * Filter, which Game to fetch.
     */
    where?: GameWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Games to fetch.
     */
    orderBy?: GameOrderByWithRelationInput | GameOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Games.
     */
    cursor?: GameWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Games from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Games.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Games.
     */
    distinct?: GameScalarFieldEnum | GameScalarFieldEnum[]
  }

  /**
   * Game findMany
   */
  export type GameFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Game
     */
    select?: GameSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Game
     */
    omit?: GameOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameInclude<ExtArgs> | null
    /**
     * Filter, which Games to fetch.
     */
    where?: GameWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Games to fetch.
     */
    orderBy?: GameOrderByWithRelationInput | GameOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Games.
     */
    cursor?: GameWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Games from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Games.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Games.
     */
    distinct?: GameScalarFieldEnum | GameScalarFieldEnum[]
  }

  /**
   * Game create
   */
  export type GameCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Game
     */
    select?: GameSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Game
     */
    omit?: GameOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameInclude<ExtArgs> | null
    /**
     * The data needed to create a Game.
     */
    data: XOR<GameCreateInput, GameUncheckedCreateInput>
  }

  /**
   * Game createMany
   */
  export type GameCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Games.
     */
    data: GameCreateManyInput | GameCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Game createManyAndReturn
   */
  export type GameCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Game
     */
    select?: GameSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Game
     */
    omit?: GameOmit<ExtArgs> | null
    /**
     * The data used to create many Games.
     */
    data: GameCreateManyInput | GameCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Game update
   */
  export type GameUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Game
     */
    select?: GameSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Game
     */
    omit?: GameOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameInclude<ExtArgs> | null
    /**
     * The data needed to update a Game.
     */
    data: XOR<GameUpdateInput, GameUncheckedUpdateInput>
    /**
     * Choose, which Game to update.
     */
    where: GameWhereUniqueInput
  }

  /**
   * Game updateMany
   */
  export type GameUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Games.
     */
    data: XOR<GameUpdateManyMutationInput, GameUncheckedUpdateManyInput>
    /**
     * Filter which Games to update
     */
    where?: GameWhereInput
    /**
     * Limit how many Games to update.
     */
    limit?: number
  }

  /**
   * Game updateManyAndReturn
   */
  export type GameUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Game
     */
    select?: GameSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Game
     */
    omit?: GameOmit<ExtArgs> | null
    /**
     * The data used to update Games.
     */
    data: XOR<GameUpdateManyMutationInput, GameUncheckedUpdateManyInput>
    /**
     * Filter which Games to update
     */
    where?: GameWhereInput
    /**
     * Limit how many Games to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Game upsert
   */
  export type GameUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Game
     */
    select?: GameSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Game
     */
    omit?: GameOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameInclude<ExtArgs> | null
    /**
     * The filter to search for the Game to update in case it exists.
     */
    where: GameWhereUniqueInput
    /**
     * In case the Game found by the `where` argument doesn't exist, create a new Game with this data.
     */
    create: XOR<GameCreateInput, GameUncheckedCreateInput>
    /**
     * In case the Game was found with the provided `where` argument, update it with this data.
     */
    update: XOR<GameUpdateInput, GameUncheckedUpdateInput>
  }

  /**
   * Game delete
   */
  export type GameDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Game
     */
    select?: GameSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Game
     */
    omit?: GameOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameInclude<ExtArgs> | null
    /**
     * Filter which Game to delete.
     */
    where: GameWhereUniqueInput
  }

  /**
   * Game deleteMany
   */
  export type GameDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Games to delete
     */
    where?: GameWhereInput
    /**
     * Limit how many Games to delete.
     */
    limit?: number
  }

  /**
   * Game.turns
   */
  export type Game$turnsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GameTurn
     */
    select?: GameTurnSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GameTurn
     */
    omit?: GameTurnOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameTurnInclude<ExtArgs> | null
    where?: GameTurnWhereInput
    orderBy?: GameTurnOrderByWithRelationInput | GameTurnOrderByWithRelationInput[]
    cursor?: GameTurnWhereUniqueInput
    take?: number
    skip?: number
    distinct?: GameTurnScalarFieldEnum | GameTurnScalarFieldEnum[]
  }

  /**
   * Game without action
   */
  export type GameDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Game
     */
    select?: GameSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Game
     */
    omit?: GameOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameInclude<ExtArgs> | null
  }


  /**
   * Model GameTurn
   */

  export type AggregateGameTurn = {
    _count: GameTurnCountAggregateOutputType | null
    _avg: GameTurnAvgAggregateOutputType | null
    _sum: GameTurnSumAggregateOutputType | null
    _min: GameTurnMinAggregateOutputType | null
    _max: GameTurnMaxAggregateOutputType | null
  }

  export type GameTurnAvgAggregateOutputType = {
    id: number | null
    gameId: number | null
    round: number | null
  }

  export type GameTurnSumAggregateOutputType = {
    id: number | null
    gameId: number | null
    round: number | null
  }

  export type GameTurnMinAggregateOutputType = {
    id: number | null
    gameId: number | null
    playerId: string | null
    round: number | null
    submittedAt: Date | null
  }

  export type GameTurnMaxAggregateOutputType = {
    id: number | null
    gameId: number | null
    playerId: string | null
    round: number | null
    submittedAt: Date | null
  }

  export type GameTurnCountAggregateOutputType = {
    id: number
    gameId: number
    playerId: number
    round: number
    actions: number
    snapshot: number
    submittedAt: number
    _all: number
  }


  export type GameTurnAvgAggregateInputType = {
    id?: true
    gameId?: true
    round?: true
  }

  export type GameTurnSumAggregateInputType = {
    id?: true
    gameId?: true
    round?: true
  }

  export type GameTurnMinAggregateInputType = {
    id?: true
    gameId?: true
    playerId?: true
    round?: true
    submittedAt?: true
  }

  export type GameTurnMaxAggregateInputType = {
    id?: true
    gameId?: true
    playerId?: true
    round?: true
    submittedAt?: true
  }

  export type GameTurnCountAggregateInputType = {
    id?: true
    gameId?: true
    playerId?: true
    round?: true
    actions?: true
    snapshot?: true
    submittedAt?: true
    _all?: true
  }

  export type GameTurnAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which GameTurn to aggregate.
     */
    where?: GameTurnWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GameTurns to fetch.
     */
    orderBy?: GameTurnOrderByWithRelationInput | GameTurnOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: GameTurnWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GameTurns from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GameTurns.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned GameTurns
    **/
    _count?: true | GameTurnCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: GameTurnAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: GameTurnSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: GameTurnMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: GameTurnMaxAggregateInputType
  }

  export type GetGameTurnAggregateType<T extends GameTurnAggregateArgs> = {
        [P in keyof T & keyof AggregateGameTurn]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateGameTurn[P]>
      : GetScalarType<T[P], AggregateGameTurn[P]>
  }




  export type GameTurnGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: GameTurnWhereInput
    orderBy?: GameTurnOrderByWithAggregationInput | GameTurnOrderByWithAggregationInput[]
    by: GameTurnScalarFieldEnum[] | GameTurnScalarFieldEnum
    having?: GameTurnScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: GameTurnCountAggregateInputType | true
    _avg?: GameTurnAvgAggregateInputType
    _sum?: GameTurnSumAggregateInputType
    _min?: GameTurnMinAggregateInputType
    _max?: GameTurnMaxAggregateInputType
  }

  export type GameTurnGroupByOutputType = {
    id: number
    gameId: number
    playerId: string
    round: number
    actions: JsonValue
    snapshot: JsonValue | null
    submittedAt: Date
    _count: GameTurnCountAggregateOutputType | null
    _avg: GameTurnAvgAggregateOutputType | null
    _sum: GameTurnSumAggregateOutputType | null
    _min: GameTurnMinAggregateOutputType | null
    _max: GameTurnMaxAggregateOutputType | null
  }

  type GetGameTurnGroupByPayload<T extends GameTurnGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<GameTurnGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof GameTurnGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], GameTurnGroupByOutputType[P]>
            : GetScalarType<T[P], GameTurnGroupByOutputType[P]>
        }
      >
    >


  export type GameTurnSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    gameId?: boolean
    playerId?: boolean
    round?: boolean
    actions?: boolean
    snapshot?: boolean
    submittedAt?: boolean
    game?: boolean | GameDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["gameTurn"]>

  export type GameTurnSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    gameId?: boolean
    playerId?: boolean
    round?: boolean
    actions?: boolean
    snapshot?: boolean
    submittedAt?: boolean
    game?: boolean | GameDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["gameTurn"]>

  export type GameTurnSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    gameId?: boolean
    playerId?: boolean
    round?: boolean
    actions?: boolean
    snapshot?: boolean
    submittedAt?: boolean
    game?: boolean | GameDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["gameTurn"]>

  export type GameTurnSelectScalar = {
    id?: boolean
    gameId?: boolean
    playerId?: boolean
    round?: boolean
    actions?: boolean
    snapshot?: boolean
    submittedAt?: boolean
  }

  export type GameTurnOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "gameId" | "playerId" | "round" | "actions" | "snapshot" | "submittedAt", ExtArgs["result"]["gameTurn"]>
  export type GameTurnInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    game?: boolean | GameDefaultArgs<ExtArgs>
  }
  export type GameTurnIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    game?: boolean | GameDefaultArgs<ExtArgs>
  }
  export type GameTurnIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    game?: boolean | GameDefaultArgs<ExtArgs>
  }

  export type $GameTurnPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "GameTurn"
    objects: {
      game: Prisma.$GamePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      gameId: number
      playerId: string
      round: number
      actions: Prisma.JsonValue
      snapshot: Prisma.JsonValue | null
      submittedAt: Date
    }, ExtArgs["result"]["gameTurn"]>
    composites: {}
  }

  type GameTurnGetPayload<S extends boolean | null | undefined | GameTurnDefaultArgs> = $Result.GetResult<Prisma.$GameTurnPayload, S>

  type GameTurnCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<GameTurnFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: GameTurnCountAggregateInputType | true
    }

  export interface GameTurnDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['GameTurn'], meta: { name: 'GameTurn' } }
    /**
     * Find zero or one GameTurn that matches the filter.
     * @param {GameTurnFindUniqueArgs} args - Arguments to find a GameTurn
     * @example
     * // Get one GameTurn
     * const gameTurn = await prisma.gameTurn.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends GameTurnFindUniqueArgs>(args: SelectSubset<T, GameTurnFindUniqueArgs<ExtArgs>>): Prisma__GameTurnClient<$Result.GetResult<Prisma.$GameTurnPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one GameTurn that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {GameTurnFindUniqueOrThrowArgs} args - Arguments to find a GameTurn
     * @example
     * // Get one GameTurn
     * const gameTurn = await prisma.gameTurn.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends GameTurnFindUniqueOrThrowArgs>(args: SelectSubset<T, GameTurnFindUniqueOrThrowArgs<ExtArgs>>): Prisma__GameTurnClient<$Result.GetResult<Prisma.$GameTurnPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first GameTurn that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GameTurnFindFirstArgs} args - Arguments to find a GameTurn
     * @example
     * // Get one GameTurn
     * const gameTurn = await prisma.gameTurn.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends GameTurnFindFirstArgs>(args?: SelectSubset<T, GameTurnFindFirstArgs<ExtArgs>>): Prisma__GameTurnClient<$Result.GetResult<Prisma.$GameTurnPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first GameTurn that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GameTurnFindFirstOrThrowArgs} args - Arguments to find a GameTurn
     * @example
     * // Get one GameTurn
     * const gameTurn = await prisma.gameTurn.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends GameTurnFindFirstOrThrowArgs>(args?: SelectSubset<T, GameTurnFindFirstOrThrowArgs<ExtArgs>>): Prisma__GameTurnClient<$Result.GetResult<Prisma.$GameTurnPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more GameTurns that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GameTurnFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all GameTurns
     * const gameTurns = await prisma.gameTurn.findMany()
     * 
     * // Get first 10 GameTurns
     * const gameTurns = await prisma.gameTurn.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const gameTurnWithIdOnly = await prisma.gameTurn.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends GameTurnFindManyArgs>(args?: SelectSubset<T, GameTurnFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GameTurnPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a GameTurn.
     * @param {GameTurnCreateArgs} args - Arguments to create a GameTurn.
     * @example
     * // Create one GameTurn
     * const GameTurn = await prisma.gameTurn.create({
     *   data: {
     *     // ... data to create a GameTurn
     *   }
     * })
     * 
     */
    create<T extends GameTurnCreateArgs>(args: SelectSubset<T, GameTurnCreateArgs<ExtArgs>>): Prisma__GameTurnClient<$Result.GetResult<Prisma.$GameTurnPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many GameTurns.
     * @param {GameTurnCreateManyArgs} args - Arguments to create many GameTurns.
     * @example
     * // Create many GameTurns
     * const gameTurn = await prisma.gameTurn.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends GameTurnCreateManyArgs>(args?: SelectSubset<T, GameTurnCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many GameTurns and returns the data saved in the database.
     * @param {GameTurnCreateManyAndReturnArgs} args - Arguments to create many GameTurns.
     * @example
     * // Create many GameTurns
     * const gameTurn = await prisma.gameTurn.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many GameTurns and only return the `id`
     * const gameTurnWithIdOnly = await prisma.gameTurn.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends GameTurnCreateManyAndReturnArgs>(args?: SelectSubset<T, GameTurnCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GameTurnPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a GameTurn.
     * @param {GameTurnDeleteArgs} args - Arguments to delete one GameTurn.
     * @example
     * // Delete one GameTurn
     * const GameTurn = await prisma.gameTurn.delete({
     *   where: {
     *     // ... filter to delete one GameTurn
     *   }
     * })
     * 
     */
    delete<T extends GameTurnDeleteArgs>(args: SelectSubset<T, GameTurnDeleteArgs<ExtArgs>>): Prisma__GameTurnClient<$Result.GetResult<Prisma.$GameTurnPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one GameTurn.
     * @param {GameTurnUpdateArgs} args - Arguments to update one GameTurn.
     * @example
     * // Update one GameTurn
     * const gameTurn = await prisma.gameTurn.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends GameTurnUpdateArgs>(args: SelectSubset<T, GameTurnUpdateArgs<ExtArgs>>): Prisma__GameTurnClient<$Result.GetResult<Prisma.$GameTurnPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more GameTurns.
     * @param {GameTurnDeleteManyArgs} args - Arguments to filter GameTurns to delete.
     * @example
     * // Delete a few GameTurns
     * const { count } = await prisma.gameTurn.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends GameTurnDeleteManyArgs>(args?: SelectSubset<T, GameTurnDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more GameTurns.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GameTurnUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many GameTurns
     * const gameTurn = await prisma.gameTurn.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends GameTurnUpdateManyArgs>(args: SelectSubset<T, GameTurnUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more GameTurns and returns the data updated in the database.
     * @param {GameTurnUpdateManyAndReturnArgs} args - Arguments to update many GameTurns.
     * @example
     * // Update many GameTurns
     * const gameTurn = await prisma.gameTurn.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more GameTurns and only return the `id`
     * const gameTurnWithIdOnly = await prisma.gameTurn.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends GameTurnUpdateManyAndReturnArgs>(args: SelectSubset<T, GameTurnUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GameTurnPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one GameTurn.
     * @param {GameTurnUpsertArgs} args - Arguments to update or create a GameTurn.
     * @example
     * // Update or create a GameTurn
     * const gameTurn = await prisma.gameTurn.upsert({
     *   create: {
     *     // ... data to create a GameTurn
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the GameTurn we want to update
     *   }
     * })
     */
    upsert<T extends GameTurnUpsertArgs>(args: SelectSubset<T, GameTurnUpsertArgs<ExtArgs>>): Prisma__GameTurnClient<$Result.GetResult<Prisma.$GameTurnPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of GameTurns.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GameTurnCountArgs} args - Arguments to filter GameTurns to count.
     * @example
     * // Count the number of GameTurns
     * const count = await prisma.gameTurn.count({
     *   where: {
     *     // ... the filter for the GameTurns we want to count
     *   }
     * })
    **/
    count<T extends GameTurnCountArgs>(
      args?: Subset<T, GameTurnCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], GameTurnCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a GameTurn.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GameTurnAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends GameTurnAggregateArgs>(args: Subset<T, GameTurnAggregateArgs>): Prisma.PrismaPromise<GetGameTurnAggregateType<T>>

    /**
     * Group by GameTurn.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GameTurnGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends GameTurnGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: GameTurnGroupByArgs['orderBy'] }
        : { orderBy?: GameTurnGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, GameTurnGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetGameTurnGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the GameTurn model
   */
  readonly fields: GameTurnFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for GameTurn.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__GameTurnClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    game<T extends GameDefaultArgs<ExtArgs> = {}>(args?: Subset<T, GameDefaultArgs<ExtArgs>>): Prisma__GameClient<$Result.GetResult<Prisma.$GamePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the GameTurn model
   */
  interface GameTurnFieldRefs {
    readonly id: FieldRef<"GameTurn", 'Int'>
    readonly gameId: FieldRef<"GameTurn", 'Int'>
    readonly playerId: FieldRef<"GameTurn", 'String'>
    readonly round: FieldRef<"GameTurn", 'Int'>
    readonly actions: FieldRef<"GameTurn", 'Json'>
    readonly snapshot: FieldRef<"GameTurn", 'Json'>
    readonly submittedAt: FieldRef<"GameTurn", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * GameTurn findUnique
   */
  export type GameTurnFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GameTurn
     */
    select?: GameTurnSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GameTurn
     */
    omit?: GameTurnOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameTurnInclude<ExtArgs> | null
    /**
     * Filter, which GameTurn to fetch.
     */
    where: GameTurnWhereUniqueInput
  }

  /**
   * GameTurn findUniqueOrThrow
   */
  export type GameTurnFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GameTurn
     */
    select?: GameTurnSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GameTurn
     */
    omit?: GameTurnOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameTurnInclude<ExtArgs> | null
    /**
     * Filter, which GameTurn to fetch.
     */
    where: GameTurnWhereUniqueInput
  }

  /**
   * GameTurn findFirst
   */
  export type GameTurnFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GameTurn
     */
    select?: GameTurnSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GameTurn
     */
    omit?: GameTurnOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameTurnInclude<ExtArgs> | null
    /**
     * Filter, which GameTurn to fetch.
     */
    where?: GameTurnWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GameTurns to fetch.
     */
    orderBy?: GameTurnOrderByWithRelationInput | GameTurnOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for GameTurns.
     */
    cursor?: GameTurnWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GameTurns from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GameTurns.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of GameTurns.
     */
    distinct?: GameTurnScalarFieldEnum | GameTurnScalarFieldEnum[]
  }

  /**
   * GameTurn findFirstOrThrow
   */
  export type GameTurnFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GameTurn
     */
    select?: GameTurnSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GameTurn
     */
    omit?: GameTurnOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameTurnInclude<ExtArgs> | null
    /**
     * Filter, which GameTurn to fetch.
     */
    where?: GameTurnWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GameTurns to fetch.
     */
    orderBy?: GameTurnOrderByWithRelationInput | GameTurnOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for GameTurns.
     */
    cursor?: GameTurnWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GameTurns from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GameTurns.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of GameTurns.
     */
    distinct?: GameTurnScalarFieldEnum | GameTurnScalarFieldEnum[]
  }

  /**
   * GameTurn findMany
   */
  export type GameTurnFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GameTurn
     */
    select?: GameTurnSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GameTurn
     */
    omit?: GameTurnOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameTurnInclude<ExtArgs> | null
    /**
     * Filter, which GameTurns to fetch.
     */
    where?: GameTurnWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GameTurns to fetch.
     */
    orderBy?: GameTurnOrderByWithRelationInput | GameTurnOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing GameTurns.
     */
    cursor?: GameTurnWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GameTurns from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GameTurns.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of GameTurns.
     */
    distinct?: GameTurnScalarFieldEnum | GameTurnScalarFieldEnum[]
  }

  /**
   * GameTurn create
   */
  export type GameTurnCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GameTurn
     */
    select?: GameTurnSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GameTurn
     */
    omit?: GameTurnOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameTurnInclude<ExtArgs> | null
    /**
     * The data needed to create a GameTurn.
     */
    data: XOR<GameTurnCreateInput, GameTurnUncheckedCreateInput>
  }

  /**
   * GameTurn createMany
   */
  export type GameTurnCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many GameTurns.
     */
    data: GameTurnCreateManyInput | GameTurnCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * GameTurn createManyAndReturn
   */
  export type GameTurnCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GameTurn
     */
    select?: GameTurnSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the GameTurn
     */
    omit?: GameTurnOmit<ExtArgs> | null
    /**
     * The data used to create many GameTurns.
     */
    data: GameTurnCreateManyInput | GameTurnCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameTurnIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * GameTurn update
   */
  export type GameTurnUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GameTurn
     */
    select?: GameTurnSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GameTurn
     */
    omit?: GameTurnOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameTurnInclude<ExtArgs> | null
    /**
     * The data needed to update a GameTurn.
     */
    data: XOR<GameTurnUpdateInput, GameTurnUncheckedUpdateInput>
    /**
     * Choose, which GameTurn to update.
     */
    where: GameTurnWhereUniqueInput
  }

  /**
   * GameTurn updateMany
   */
  export type GameTurnUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update GameTurns.
     */
    data: XOR<GameTurnUpdateManyMutationInput, GameTurnUncheckedUpdateManyInput>
    /**
     * Filter which GameTurns to update
     */
    where?: GameTurnWhereInput
    /**
     * Limit how many GameTurns to update.
     */
    limit?: number
  }

  /**
   * GameTurn updateManyAndReturn
   */
  export type GameTurnUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GameTurn
     */
    select?: GameTurnSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the GameTurn
     */
    omit?: GameTurnOmit<ExtArgs> | null
    /**
     * The data used to update GameTurns.
     */
    data: XOR<GameTurnUpdateManyMutationInput, GameTurnUncheckedUpdateManyInput>
    /**
     * Filter which GameTurns to update
     */
    where?: GameTurnWhereInput
    /**
     * Limit how many GameTurns to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameTurnIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * GameTurn upsert
   */
  export type GameTurnUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GameTurn
     */
    select?: GameTurnSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GameTurn
     */
    omit?: GameTurnOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameTurnInclude<ExtArgs> | null
    /**
     * The filter to search for the GameTurn to update in case it exists.
     */
    where: GameTurnWhereUniqueInput
    /**
     * In case the GameTurn found by the `where` argument doesn't exist, create a new GameTurn with this data.
     */
    create: XOR<GameTurnCreateInput, GameTurnUncheckedCreateInput>
    /**
     * In case the GameTurn was found with the provided `where` argument, update it with this data.
     */
    update: XOR<GameTurnUpdateInput, GameTurnUncheckedUpdateInput>
  }

  /**
   * GameTurn delete
   */
  export type GameTurnDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GameTurn
     */
    select?: GameTurnSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GameTurn
     */
    omit?: GameTurnOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameTurnInclude<ExtArgs> | null
    /**
     * Filter which GameTurn to delete.
     */
    where: GameTurnWhereUniqueInput
  }

  /**
   * GameTurn deleteMany
   */
  export type GameTurnDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which GameTurns to delete
     */
    where?: GameTurnWhereInput
    /**
     * Limit how many GameTurns to delete.
     */
    limit?: number
  }

  /**
   * GameTurn without action
   */
  export type GameTurnDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GameTurn
     */
    select?: GameTurnSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GameTurn
     */
    omit?: GameTurnOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameTurnInclude<ExtArgs> | null
  }


  /**
   * Model Map
   */

  export type AggregateMap = {
    _count: MapCountAggregateOutputType | null
    _avg: MapAvgAggregateOutputType | null
    _sum: MapSumAggregateOutputType | null
    _min: MapMinAggregateOutputType | null
    _max: MapMaxAggregateOutputType | null
  }

  export type MapAvgAggregateOutputType = {
    id: number | null
    gridWidth: number | null
    gridHeight: number | null
  }

  export type MapSumAggregateOutputType = {
    id: number | null
    gridWidth: number | null
    gridHeight: number | null
  }

  export type MapMinAggregateOutputType = {
    id: number | null
    name: string | null
    gridWidth: number | null
    gridHeight: number | null
    createdAt: Date | null
  }

  export type MapMaxAggregateOutputType = {
    id: number | null
    name: string | null
    gridWidth: number | null
    gridHeight: number | null
    createdAt: Date | null
  }

  export type MapCountAggregateOutputType = {
    id: number
    name: number
    gridWidth: number
    gridHeight: number
    blockedTiles: number
    scoringTiles: number
    createdAt: number
    _all: number
  }


  export type MapAvgAggregateInputType = {
    id?: true
    gridWidth?: true
    gridHeight?: true
  }

  export type MapSumAggregateInputType = {
    id?: true
    gridWidth?: true
    gridHeight?: true
  }

  export type MapMinAggregateInputType = {
    id?: true
    name?: true
    gridWidth?: true
    gridHeight?: true
    createdAt?: true
  }

  export type MapMaxAggregateInputType = {
    id?: true
    name?: true
    gridWidth?: true
    gridHeight?: true
    createdAt?: true
  }

  export type MapCountAggregateInputType = {
    id?: true
    name?: true
    gridWidth?: true
    gridHeight?: true
    blockedTiles?: true
    scoringTiles?: true
    createdAt?: true
    _all?: true
  }

  export type MapAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Map to aggregate.
     */
    where?: MapWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Maps to fetch.
     */
    orderBy?: MapOrderByWithRelationInput | MapOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: MapWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Maps from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Maps.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Maps
    **/
    _count?: true | MapCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: MapAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: MapSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: MapMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: MapMaxAggregateInputType
  }

  export type GetMapAggregateType<T extends MapAggregateArgs> = {
        [P in keyof T & keyof AggregateMap]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateMap[P]>
      : GetScalarType<T[P], AggregateMap[P]>
  }




  export type MapGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MapWhereInput
    orderBy?: MapOrderByWithAggregationInput | MapOrderByWithAggregationInput[]
    by: MapScalarFieldEnum[] | MapScalarFieldEnum
    having?: MapScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: MapCountAggregateInputType | true
    _avg?: MapAvgAggregateInputType
    _sum?: MapSumAggregateInputType
    _min?: MapMinAggregateInputType
    _max?: MapMaxAggregateInputType
  }

  export type MapGroupByOutputType = {
    id: number
    name: string
    gridWidth: number
    gridHeight: number
    blockedTiles: JsonValue
    scoringTiles: JsonValue
    createdAt: Date
    _count: MapCountAggregateOutputType | null
    _avg: MapAvgAggregateOutputType | null
    _sum: MapSumAggregateOutputType | null
    _min: MapMinAggregateOutputType | null
    _max: MapMaxAggregateOutputType | null
  }

  type GetMapGroupByPayload<T extends MapGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<MapGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof MapGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], MapGroupByOutputType[P]>
            : GetScalarType<T[P], MapGroupByOutputType[P]>
        }
      >
    >


  export type MapSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    gridWidth?: boolean
    gridHeight?: boolean
    blockedTiles?: boolean
    scoringTiles?: boolean
    createdAt?: boolean
    lobbies?: boolean | Map$lobbiesArgs<ExtArgs>
    _count?: boolean | MapCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["map"]>

  export type MapSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    gridWidth?: boolean
    gridHeight?: boolean
    blockedTiles?: boolean
    scoringTiles?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["map"]>

  export type MapSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    gridWidth?: boolean
    gridHeight?: boolean
    blockedTiles?: boolean
    scoringTiles?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["map"]>

  export type MapSelectScalar = {
    id?: boolean
    name?: boolean
    gridWidth?: boolean
    gridHeight?: boolean
    blockedTiles?: boolean
    scoringTiles?: boolean
    createdAt?: boolean
  }

  export type MapOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "gridWidth" | "gridHeight" | "blockedTiles" | "scoringTiles" | "createdAt", ExtArgs["result"]["map"]>
  export type MapInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    lobbies?: boolean | Map$lobbiesArgs<ExtArgs>
    _count?: boolean | MapCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type MapIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type MapIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $MapPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Map"
    objects: {
      lobbies: Prisma.$LobbyPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      name: string
      gridWidth: number
      gridHeight: number
      blockedTiles: Prisma.JsonValue
      scoringTiles: Prisma.JsonValue
      createdAt: Date
    }, ExtArgs["result"]["map"]>
    composites: {}
  }

  type MapGetPayload<S extends boolean | null | undefined | MapDefaultArgs> = $Result.GetResult<Prisma.$MapPayload, S>

  type MapCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<MapFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: MapCountAggregateInputType | true
    }

  export interface MapDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Map'], meta: { name: 'Map' } }
    /**
     * Find zero or one Map that matches the filter.
     * @param {MapFindUniqueArgs} args - Arguments to find a Map
     * @example
     * // Get one Map
     * const map = await prisma.map.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends MapFindUniqueArgs>(args: SelectSubset<T, MapFindUniqueArgs<ExtArgs>>): Prisma__MapClient<$Result.GetResult<Prisma.$MapPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Map that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {MapFindUniqueOrThrowArgs} args - Arguments to find a Map
     * @example
     * // Get one Map
     * const map = await prisma.map.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends MapFindUniqueOrThrowArgs>(args: SelectSubset<T, MapFindUniqueOrThrowArgs<ExtArgs>>): Prisma__MapClient<$Result.GetResult<Prisma.$MapPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Map that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MapFindFirstArgs} args - Arguments to find a Map
     * @example
     * // Get one Map
     * const map = await prisma.map.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends MapFindFirstArgs>(args?: SelectSubset<T, MapFindFirstArgs<ExtArgs>>): Prisma__MapClient<$Result.GetResult<Prisma.$MapPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Map that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MapFindFirstOrThrowArgs} args - Arguments to find a Map
     * @example
     * // Get one Map
     * const map = await prisma.map.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends MapFindFirstOrThrowArgs>(args?: SelectSubset<T, MapFindFirstOrThrowArgs<ExtArgs>>): Prisma__MapClient<$Result.GetResult<Prisma.$MapPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Maps that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MapFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Maps
     * const maps = await prisma.map.findMany()
     * 
     * // Get first 10 Maps
     * const maps = await prisma.map.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const mapWithIdOnly = await prisma.map.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends MapFindManyArgs>(args?: SelectSubset<T, MapFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MapPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Map.
     * @param {MapCreateArgs} args - Arguments to create a Map.
     * @example
     * // Create one Map
     * const Map = await prisma.map.create({
     *   data: {
     *     // ... data to create a Map
     *   }
     * })
     * 
     */
    create<T extends MapCreateArgs>(args: SelectSubset<T, MapCreateArgs<ExtArgs>>): Prisma__MapClient<$Result.GetResult<Prisma.$MapPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Maps.
     * @param {MapCreateManyArgs} args - Arguments to create many Maps.
     * @example
     * // Create many Maps
     * const map = await prisma.map.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends MapCreateManyArgs>(args?: SelectSubset<T, MapCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Maps and returns the data saved in the database.
     * @param {MapCreateManyAndReturnArgs} args - Arguments to create many Maps.
     * @example
     * // Create many Maps
     * const map = await prisma.map.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Maps and only return the `id`
     * const mapWithIdOnly = await prisma.map.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends MapCreateManyAndReturnArgs>(args?: SelectSubset<T, MapCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MapPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Map.
     * @param {MapDeleteArgs} args - Arguments to delete one Map.
     * @example
     * // Delete one Map
     * const Map = await prisma.map.delete({
     *   where: {
     *     // ... filter to delete one Map
     *   }
     * })
     * 
     */
    delete<T extends MapDeleteArgs>(args: SelectSubset<T, MapDeleteArgs<ExtArgs>>): Prisma__MapClient<$Result.GetResult<Prisma.$MapPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Map.
     * @param {MapUpdateArgs} args - Arguments to update one Map.
     * @example
     * // Update one Map
     * const map = await prisma.map.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends MapUpdateArgs>(args: SelectSubset<T, MapUpdateArgs<ExtArgs>>): Prisma__MapClient<$Result.GetResult<Prisma.$MapPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Maps.
     * @param {MapDeleteManyArgs} args - Arguments to filter Maps to delete.
     * @example
     * // Delete a few Maps
     * const { count } = await prisma.map.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends MapDeleteManyArgs>(args?: SelectSubset<T, MapDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Maps.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MapUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Maps
     * const map = await prisma.map.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends MapUpdateManyArgs>(args: SelectSubset<T, MapUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Maps and returns the data updated in the database.
     * @param {MapUpdateManyAndReturnArgs} args - Arguments to update many Maps.
     * @example
     * // Update many Maps
     * const map = await prisma.map.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Maps and only return the `id`
     * const mapWithIdOnly = await prisma.map.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends MapUpdateManyAndReturnArgs>(args: SelectSubset<T, MapUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MapPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Map.
     * @param {MapUpsertArgs} args - Arguments to update or create a Map.
     * @example
     * // Update or create a Map
     * const map = await prisma.map.upsert({
     *   create: {
     *     // ... data to create a Map
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Map we want to update
     *   }
     * })
     */
    upsert<T extends MapUpsertArgs>(args: SelectSubset<T, MapUpsertArgs<ExtArgs>>): Prisma__MapClient<$Result.GetResult<Prisma.$MapPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Maps.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MapCountArgs} args - Arguments to filter Maps to count.
     * @example
     * // Count the number of Maps
     * const count = await prisma.map.count({
     *   where: {
     *     // ... the filter for the Maps we want to count
     *   }
     * })
    **/
    count<T extends MapCountArgs>(
      args?: Subset<T, MapCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], MapCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Map.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MapAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends MapAggregateArgs>(args: Subset<T, MapAggregateArgs>): Prisma.PrismaPromise<GetMapAggregateType<T>>

    /**
     * Group by Map.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MapGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends MapGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: MapGroupByArgs['orderBy'] }
        : { orderBy?: MapGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, MapGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetMapGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Map model
   */
  readonly fields: MapFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Map.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__MapClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    lobbies<T extends Map$lobbiesArgs<ExtArgs> = {}>(args?: Subset<T, Map$lobbiesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LobbyPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Map model
   */
  interface MapFieldRefs {
    readonly id: FieldRef<"Map", 'Int'>
    readonly name: FieldRef<"Map", 'String'>
    readonly gridWidth: FieldRef<"Map", 'Int'>
    readonly gridHeight: FieldRef<"Map", 'Int'>
    readonly blockedTiles: FieldRef<"Map", 'Json'>
    readonly scoringTiles: FieldRef<"Map", 'Json'>
    readonly createdAt: FieldRef<"Map", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Map findUnique
   */
  export type MapFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Map
     */
    select?: MapSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Map
     */
    omit?: MapOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MapInclude<ExtArgs> | null
    /**
     * Filter, which Map to fetch.
     */
    where: MapWhereUniqueInput
  }

  /**
   * Map findUniqueOrThrow
   */
  export type MapFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Map
     */
    select?: MapSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Map
     */
    omit?: MapOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MapInclude<ExtArgs> | null
    /**
     * Filter, which Map to fetch.
     */
    where: MapWhereUniqueInput
  }

  /**
   * Map findFirst
   */
  export type MapFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Map
     */
    select?: MapSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Map
     */
    omit?: MapOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MapInclude<ExtArgs> | null
    /**
     * Filter, which Map to fetch.
     */
    where?: MapWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Maps to fetch.
     */
    orderBy?: MapOrderByWithRelationInput | MapOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Maps.
     */
    cursor?: MapWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Maps from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Maps.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Maps.
     */
    distinct?: MapScalarFieldEnum | MapScalarFieldEnum[]
  }

  /**
   * Map findFirstOrThrow
   */
  export type MapFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Map
     */
    select?: MapSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Map
     */
    omit?: MapOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MapInclude<ExtArgs> | null
    /**
     * Filter, which Map to fetch.
     */
    where?: MapWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Maps to fetch.
     */
    orderBy?: MapOrderByWithRelationInput | MapOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Maps.
     */
    cursor?: MapWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Maps from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Maps.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Maps.
     */
    distinct?: MapScalarFieldEnum | MapScalarFieldEnum[]
  }

  /**
   * Map findMany
   */
  export type MapFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Map
     */
    select?: MapSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Map
     */
    omit?: MapOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MapInclude<ExtArgs> | null
    /**
     * Filter, which Maps to fetch.
     */
    where?: MapWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Maps to fetch.
     */
    orderBy?: MapOrderByWithRelationInput | MapOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Maps.
     */
    cursor?: MapWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Maps from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Maps.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Maps.
     */
    distinct?: MapScalarFieldEnum | MapScalarFieldEnum[]
  }

  /**
   * Map create
   */
  export type MapCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Map
     */
    select?: MapSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Map
     */
    omit?: MapOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MapInclude<ExtArgs> | null
    /**
     * The data needed to create a Map.
     */
    data: XOR<MapCreateInput, MapUncheckedCreateInput>
  }

  /**
   * Map createMany
   */
  export type MapCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Maps.
     */
    data: MapCreateManyInput | MapCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Map createManyAndReturn
   */
  export type MapCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Map
     */
    select?: MapSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Map
     */
    omit?: MapOmit<ExtArgs> | null
    /**
     * The data used to create many Maps.
     */
    data: MapCreateManyInput | MapCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Map update
   */
  export type MapUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Map
     */
    select?: MapSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Map
     */
    omit?: MapOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MapInclude<ExtArgs> | null
    /**
     * The data needed to update a Map.
     */
    data: XOR<MapUpdateInput, MapUncheckedUpdateInput>
    /**
     * Choose, which Map to update.
     */
    where: MapWhereUniqueInput
  }

  /**
   * Map updateMany
   */
  export type MapUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Maps.
     */
    data: XOR<MapUpdateManyMutationInput, MapUncheckedUpdateManyInput>
    /**
     * Filter which Maps to update
     */
    where?: MapWhereInput
    /**
     * Limit how many Maps to update.
     */
    limit?: number
  }

  /**
   * Map updateManyAndReturn
   */
  export type MapUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Map
     */
    select?: MapSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Map
     */
    omit?: MapOmit<ExtArgs> | null
    /**
     * The data used to update Maps.
     */
    data: XOR<MapUpdateManyMutationInput, MapUncheckedUpdateManyInput>
    /**
     * Filter which Maps to update
     */
    where?: MapWhereInput
    /**
     * Limit how many Maps to update.
     */
    limit?: number
  }

  /**
   * Map upsert
   */
  export type MapUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Map
     */
    select?: MapSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Map
     */
    omit?: MapOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MapInclude<ExtArgs> | null
    /**
     * The filter to search for the Map to update in case it exists.
     */
    where: MapWhereUniqueInput
    /**
     * In case the Map found by the `where` argument doesn't exist, create a new Map with this data.
     */
    create: XOR<MapCreateInput, MapUncheckedCreateInput>
    /**
     * In case the Map was found with the provided `where` argument, update it with this data.
     */
    update: XOR<MapUpdateInput, MapUncheckedUpdateInput>
  }

  /**
   * Map delete
   */
  export type MapDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Map
     */
    select?: MapSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Map
     */
    omit?: MapOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MapInclude<ExtArgs> | null
    /**
     * Filter which Map to delete.
     */
    where: MapWhereUniqueInput
  }

  /**
   * Map deleteMany
   */
  export type MapDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Maps to delete
     */
    where?: MapWhereInput
    /**
     * Limit how many Maps to delete.
     */
    limit?: number
  }

  /**
   * Map.lobbies
   */
  export type Map$lobbiesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Lobby
     */
    select?: LobbySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Lobby
     */
    omit?: LobbyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LobbyInclude<ExtArgs> | null
    where?: LobbyWhereInput
    orderBy?: LobbyOrderByWithRelationInput | LobbyOrderByWithRelationInput[]
    cursor?: LobbyWhereUniqueInput
    take?: number
    skip?: number
    distinct?: LobbyScalarFieldEnum | LobbyScalarFieldEnum[]
  }

  /**
   * Map without action
   */
  export type MapDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Map
     */
    select?: MapSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Map
     */
    omit?: MapOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MapInclude<ExtArgs> | null
  }


  /**
   * Model Config
   */

  export type AggregateConfig = {
    _count: ConfigCountAggregateOutputType | null
    _min: ConfigMinAggregateOutputType | null
    _max: ConfigMaxAggregateOutputType | null
  }

  export type ConfigMinAggregateOutputType = {
    key: string | null
    updatedAt: Date | null
  }

  export type ConfigMaxAggregateOutputType = {
    key: string | null
    updatedAt: Date | null
  }

  export type ConfigCountAggregateOutputType = {
    key: number
    value: number
    updatedAt: number
    _all: number
  }


  export type ConfigMinAggregateInputType = {
    key?: true
    updatedAt?: true
  }

  export type ConfigMaxAggregateInputType = {
    key?: true
    updatedAt?: true
  }

  export type ConfigCountAggregateInputType = {
    key?: true
    value?: true
    updatedAt?: true
    _all?: true
  }

  export type ConfigAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Config to aggregate.
     */
    where?: ConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Configs to fetch.
     */
    orderBy?: ConfigOrderByWithRelationInput | ConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Configs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Configs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Configs
    **/
    _count?: true | ConfigCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ConfigMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ConfigMaxAggregateInputType
  }

  export type GetConfigAggregateType<T extends ConfigAggregateArgs> = {
        [P in keyof T & keyof AggregateConfig]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateConfig[P]>
      : GetScalarType<T[P], AggregateConfig[P]>
  }




  export type ConfigGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ConfigWhereInput
    orderBy?: ConfigOrderByWithAggregationInput | ConfigOrderByWithAggregationInput[]
    by: ConfigScalarFieldEnum[] | ConfigScalarFieldEnum
    having?: ConfigScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ConfigCountAggregateInputType | true
    _min?: ConfigMinAggregateInputType
    _max?: ConfigMaxAggregateInputType
  }

  export type ConfigGroupByOutputType = {
    key: string
    value: JsonValue
    updatedAt: Date
    _count: ConfigCountAggregateOutputType | null
    _min: ConfigMinAggregateOutputType | null
    _max: ConfigMaxAggregateOutputType | null
  }

  type GetConfigGroupByPayload<T extends ConfigGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ConfigGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ConfigGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ConfigGroupByOutputType[P]>
            : GetScalarType<T[P], ConfigGroupByOutputType[P]>
        }
      >
    >


  export type ConfigSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    key?: boolean
    value?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["config"]>

  export type ConfigSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    key?: boolean
    value?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["config"]>

  export type ConfigSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    key?: boolean
    value?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["config"]>

  export type ConfigSelectScalar = {
    key?: boolean
    value?: boolean
    updatedAt?: boolean
  }

  export type ConfigOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"key" | "value" | "updatedAt", ExtArgs["result"]["config"]>

  export type $ConfigPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Config"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      key: string
      value: Prisma.JsonValue
      updatedAt: Date
    }, ExtArgs["result"]["config"]>
    composites: {}
  }

  type ConfigGetPayload<S extends boolean | null | undefined | ConfigDefaultArgs> = $Result.GetResult<Prisma.$ConfigPayload, S>

  type ConfigCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ConfigFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ConfigCountAggregateInputType | true
    }

  export interface ConfigDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Config'], meta: { name: 'Config' } }
    /**
     * Find zero or one Config that matches the filter.
     * @param {ConfigFindUniqueArgs} args - Arguments to find a Config
     * @example
     * // Get one Config
     * const config = await prisma.config.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ConfigFindUniqueArgs>(args: SelectSubset<T, ConfigFindUniqueArgs<ExtArgs>>): Prisma__ConfigClient<$Result.GetResult<Prisma.$ConfigPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Config that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ConfigFindUniqueOrThrowArgs} args - Arguments to find a Config
     * @example
     * // Get one Config
     * const config = await prisma.config.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ConfigFindUniqueOrThrowArgs>(args: SelectSubset<T, ConfigFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ConfigClient<$Result.GetResult<Prisma.$ConfigPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Config that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConfigFindFirstArgs} args - Arguments to find a Config
     * @example
     * // Get one Config
     * const config = await prisma.config.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ConfigFindFirstArgs>(args?: SelectSubset<T, ConfigFindFirstArgs<ExtArgs>>): Prisma__ConfigClient<$Result.GetResult<Prisma.$ConfigPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Config that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConfigFindFirstOrThrowArgs} args - Arguments to find a Config
     * @example
     * // Get one Config
     * const config = await prisma.config.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ConfigFindFirstOrThrowArgs>(args?: SelectSubset<T, ConfigFindFirstOrThrowArgs<ExtArgs>>): Prisma__ConfigClient<$Result.GetResult<Prisma.$ConfigPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Configs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConfigFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Configs
     * const configs = await prisma.config.findMany()
     * 
     * // Get first 10 Configs
     * const configs = await prisma.config.findMany({ take: 10 })
     * 
     * // Only select the `key`
     * const configWithKeyOnly = await prisma.config.findMany({ select: { key: true } })
     * 
     */
    findMany<T extends ConfigFindManyArgs>(args?: SelectSubset<T, ConfigFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConfigPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Config.
     * @param {ConfigCreateArgs} args - Arguments to create a Config.
     * @example
     * // Create one Config
     * const Config = await prisma.config.create({
     *   data: {
     *     // ... data to create a Config
     *   }
     * })
     * 
     */
    create<T extends ConfigCreateArgs>(args: SelectSubset<T, ConfigCreateArgs<ExtArgs>>): Prisma__ConfigClient<$Result.GetResult<Prisma.$ConfigPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Configs.
     * @param {ConfigCreateManyArgs} args - Arguments to create many Configs.
     * @example
     * // Create many Configs
     * const config = await prisma.config.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ConfigCreateManyArgs>(args?: SelectSubset<T, ConfigCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Configs and returns the data saved in the database.
     * @param {ConfigCreateManyAndReturnArgs} args - Arguments to create many Configs.
     * @example
     * // Create many Configs
     * const config = await prisma.config.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Configs and only return the `key`
     * const configWithKeyOnly = await prisma.config.createManyAndReturn({
     *   select: { key: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ConfigCreateManyAndReturnArgs>(args?: SelectSubset<T, ConfigCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConfigPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Config.
     * @param {ConfigDeleteArgs} args - Arguments to delete one Config.
     * @example
     * // Delete one Config
     * const Config = await prisma.config.delete({
     *   where: {
     *     // ... filter to delete one Config
     *   }
     * })
     * 
     */
    delete<T extends ConfigDeleteArgs>(args: SelectSubset<T, ConfigDeleteArgs<ExtArgs>>): Prisma__ConfigClient<$Result.GetResult<Prisma.$ConfigPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Config.
     * @param {ConfigUpdateArgs} args - Arguments to update one Config.
     * @example
     * // Update one Config
     * const config = await prisma.config.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ConfigUpdateArgs>(args: SelectSubset<T, ConfigUpdateArgs<ExtArgs>>): Prisma__ConfigClient<$Result.GetResult<Prisma.$ConfigPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Configs.
     * @param {ConfigDeleteManyArgs} args - Arguments to filter Configs to delete.
     * @example
     * // Delete a few Configs
     * const { count } = await prisma.config.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ConfigDeleteManyArgs>(args?: SelectSubset<T, ConfigDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Configs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConfigUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Configs
     * const config = await prisma.config.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ConfigUpdateManyArgs>(args: SelectSubset<T, ConfigUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Configs and returns the data updated in the database.
     * @param {ConfigUpdateManyAndReturnArgs} args - Arguments to update many Configs.
     * @example
     * // Update many Configs
     * const config = await prisma.config.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Configs and only return the `key`
     * const configWithKeyOnly = await prisma.config.updateManyAndReturn({
     *   select: { key: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ConfigUpdateManyAndReturnArgs>(args: SelectSubset<T, ConfigUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConfigPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Config.
     * @param {ConfigUpsertArgs} args - Arguments to update or create a Config.
     * @example
     * // Update or create a Config
     * const config = await prisma.config.upsert({
     *   create: {
     *     // ... data to create a Config
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Config we want to update
     *   }
     * })
     */
    upsert<T extends ConfigUpsertArgs>(args: SelectSubset<T, ConfigUpsertArgs<ExtArgs>>): Prisma__ConfigClient<$Result.GetResult<Prisma.$ConfigPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Configs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConfigCountArgs} args - Arguments to filter Configs to count.
     * @example
     * // Count the number of Configs
     * const count = await prisma.config.count({
     *   where: {
     *     // ... the filter for the Configs we want to count
     *   }
     * })
    **/
    count<T extends ConfigCountArgs>(
      args?: Subset<T, ConfigCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ConfigCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Config.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConfigAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ConfigAggregateArgs>(args: Subset<T, ConfigAggregateArgs>): Prisma.PrismaPromise<GetConfigAggregateType<T>>

    /**
     * Group by Config.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConfigGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ConfigGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ConfigGroupByArgs['orderBy'] }
        : { orderBy?: ConfigGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ConfigGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetConfigGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Config model
   */
  readonly fields: ConfigFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Config.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ConfigClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Config model
   */
  interface ConfigFieldRefs {
    readonly key: FieldRef<"Config", 'String'>
    readonly value: FieldRef<"Config", 'Json'>
    readonly updatedAt: FieldRef<"Config", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Config findUnique
   */
  export type ConfigFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Config
     */
    select?: ConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Config
     */
    omit?: ConfigOmit<ExtArgs> | null
    /**
     * Filter, which Config to fetch.
     */
    where: ConfigWhereUniqueInput
  }

  /**
   * Config findUniqueOrThrow
   */
  export type ConfigFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Config
     */
    select?: ConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Config
     */
    omit?: ConfigOmit<ExtArgs> | null
    /**
     * Filter, which Config to fetch.
     */
    where: ConfigWhereUniqueInput
  }

  /**
   * Config findFirst
   */
  export type ConfigFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Config
     */
    select?: ConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Config
     */
    omit?: ConfigOmit<ExtArgs> | null
    /**
     * Filter, which Config to fetch.
     */
    where?: ConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Configs to fetch.
     */
    orderBy?: ConfigOrderByWithRelationInput | ConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Configs.
     */
    cursor?: ConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Configs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Configs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Configs.
     */
    distinct?: ConfigScalarFieldEnum | ConfigScalarFieldEnum[]
  }

  /**
   * Config findFirstOrThrow
   */
  export type ConfigFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Config
     */
    select?: ConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Config
     */
    omit?: ConfigOmit<ExtArgs> | null
    /**
     * Filter, which Config to fetch.
     */
    where?: ConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Configs to fetch.
     */
    orderBy?: ConfigOrderByWithRelationInput | ConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Configs.
     */
    cursor?: ConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Configs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Configs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Configs.
     */
    distinct?: ConfigScalarFieldEnum | ConfigScalarFieldEnum[]
  }

  /**
   * Config findMany
   */
  export type ConfigFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Config
     */
    select?: ConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Config
     */
    omit?: ConfigOmit<ExtArgs> | null
    /**
     * Filter, which Configs to fetch.
     */
    where?: ConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Configs to fetch.
     */
    orderBy?: ConfigOrderByWithRelationInput | ConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Configs.
     */
    cursor?: ConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Configs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Configs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Configs.
     */
    distinct?: ConfigScalarFieldEnum | ConfigScalarFieldEnum[]
  }

  /**
   * Config create
   */
  export type ConfigCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Config
     */
    select?: ConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Config
     */
    omit?: ConfigOmit<ExtArgs> | null
    /**
     * The data needed to create a Config.
     */
    data: XOR<ConfigCreateInput, ConfigUncheckedCreateInput>
  }

  /**
   * Config createMany
   */
  export type ConfigCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Configs.
     */
    data: ConfigCreateManyInput | ConfigCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Config createManyAndReturn
   */
  export type ConfigCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Config
     */
    select?: ConfigSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Config
     */
    omit?: ConfigOmit<ExtArgs> | null
    /**
     * The data used to create many Configs.
     */
    data: ConfigCreateManyInput | ConfigCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Config update
   */
  export type ConfigUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Config
     */
    select?: ConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Config
     */
    omit?: ConfigOmit<ExtArgs> | null
    /**
     * The data needed to update a Config.
     */
    data: XOR<ConfigUpdateInput, ConfigUncheckedUpdateInput>
    /**
     * Choose, which Config to update.
     */
    where: ConfigWhereUniqueInput
  }

  /**
   * Config updateMany
   */
  export type ConfigUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Configs.
     */
    data: XOR<ConfigUpdateManyMutationInput, ConfigUncheckedUpdateManyInput>
    /**
     * Filter which Configs to update
     */
    where?: ConfigWhereInput
    /**
     * Limit how many Configs to update.
     */
    limit?: number
  }

  /**
   * Config updateManyAndReturn
   */
  export type ConfigUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Config
     */
    select?: ConfigSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Config
     */
    omit?: ConfigOmit<ExtArgs> | null
    /**
     * The data used to update Configs.
     */
    data: XOR<ConfigUpdateManyMutationInput, ConfigUncheckedUpdateManyInput>
    /**
     * Filter which Configs to update
     */
    where?: ConfigWhereInput
    /**
     * Limit how many Configs to update.
     */
    limit?: number
  }

  /**
   * Config upsert
   */
  export type ConfigUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Config
     */
    select?: ConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Config
     */
    omit?: ConfigOmit<ExtArgs> | null
    /**
     * The filter to search for the Config to update in case it exists.
     */
    where: ConfigWhereUniqueInput
    /**
     * In case the Config found by the `where` argument doesn't exist, create a new Config with this data.
     */
    create: XOR<ConfigCreateInput, ConfigUncheckedCreateInput>
    /**
     * In case the Config was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ConfigUpdateInput, ConfigUncheckedUpdateInput>
  }

  /**
   * Config delete
   */
  export type ConfigDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Config
     */
    select?: ConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Config
     */
    omit?: ConfigOmit<ExtArgs> | null
    /**
     * Filter which Config to delete.
     */
    where: ConfigWhereUniqueInput
  }

  /**
   * Config deleteMany
   */
  export type ConfigDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Configs to delete
     */
    where?: ConfigWhereInput
    /**
     * Limit how many Configs to delete.
     */
    limit?: number
  }

  /**
   * Config without action
   */
  export type ConfigDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Config
     */
    select?: ConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Config
     */
    omit?: ConfigOmit<ExtArgs> | null
  }


  /**
   * Model PlayerStats
   */

  export type AggregatePlayerStats = {
    _count: PlayerStatsCountAggregateOutputType | null
    _avg: PlayerStatsAvgAggregateOutputType | null
    _sum: PlayerStatsSumAggregateOutputType | null
    _min: PlayerStatsMinAggregateOutputType | null
    _max: PlayerStatsMaxAggregateOutputType | null
  }

  export type PlayerStatsAvgAggregateOutputType = {
    wins: number | null
    losses: number | null
    draws: number | null
    totalGames: number | null
  }

  export type PlayerStatsSumAggregateOutputType = {
    wins: number | null
    losses: number | null
    draws: number | null
    totalGames: number | null
  }

  export type PlayerStatsMinAggregateOutputType = {
    userId: string | null
    wins: number | null
    losses: number | null
    draws: number | null
    totalGames: number | null
  }

  export type PlayerStatsMaxAggregateOutputType = {
    userId: string | null
    wins: number | null
    losses: number | null
    draws: number | null
    totalGames: number | null
  }

  export type PlayerStatsCountAggregateOutputType = {
    userId: number
    wins: number
    losses: number
    draws: number
    totalGames: number
    _all: number
  }


  export type PlayerStatsAvgAggregateInputType = {
    wins?: true
    losses?: true
    draws?: true
    totalGames?: true
  }

  export type PlayerStatsSumAggregateInputType = {
    wins?: true
    losses?: true
    draws?: true
    totalGames?: true
  }

  export type PlayerStatsMinAggregateInputType = {
    userId?: true
    wins?: true
    losses?: true
    draws?: true
    totalGames?: true
  }

  export type PlayerStatsMaxAggregateInputType = {
    userId?: true
    wins?: true
    losses?: true
    draws?: true
    totalGames?: true
  }

  export type PlayerStatsCountAggregateInputType = {
    userId?: true
    wins?: true
    losses?: true
    draws?: true
    totalGames?: true
    _all?: true
  }

  export type PlayerStatsAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PlayerStats to aggregate.
     */
    where?: PlayerStatsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PlayerStats to fetch.
     */
    orderBy?: PlayerStatsOrderByWithRelationInput | PlayerStatsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: PlayerStatsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PlayerStats from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PlayerStats.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned PlayerStats
    **/
    _count?: true | PlayerStatsCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: PlayerStatsAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: PlayerStatsSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: PlayerStatsMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: PlayerStatsMaxAggregateInputType
  }

  export type GetPlayerStatsAggregateType<T extends PlayerStatsAggregateArgs> = {
        [P in keyof T & keyof AggregatePlayerStats]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregatePlayerStats[P]>
      : GetScalarType<T[P], AggregatePlayerStats[P]>
  }




  export type PlayerStatsGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PlayerStatsWhereInput
    orderBy?: PlayerStatsOrderByWithAggregationInput | PlayerStatsOrderByWithAggregationInput[]
    by: PlayerStatsScalarFieldEnum[] | PlayerStatsScalarFieldEnum
    having?: PlayerStatsScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: PlayerStatsCountAggregateInputType | true
    _avg?: PlayerStatsAvgAggregateInputType
    _sum?: PlayerStatsSumAggregateInputType
    _min?: PlayerStatsMinAggregateInputType
    _max?: PlayerStatsMaxAggregateInputType
  }

  export type PlayerStatsGroupByOutputType = {
    userId: string
    wins: number
    losses: number
    draws: number
    totalGames: number
    _count: PlayerStatsCountAggregateOutputType | null
    _avg: PlayerStatsAvgAggregateOutputType | null
    _sum: PlayerStatsSumAggregateOutputType | null
    _min: PlayerStatsMinAggregateOutputType | null
    _max: PlayerStatsMaxAggregateOutputType | null
  }

  type GetPlayerStatsGroupByPayload<T extends PlayerStatsGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<PlayerStatsGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof PlayerStatsGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], PlayerStatsGroupByOutputType[P]>
            : GetScalarType<T[P], PlayerStatsGroupByOutputType[P]>
        }
      >
    >


  export type PlayerStatsSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    userId?: boolean
    wins?: boolean
    losses?: boolean
    draws?: boolean
    totalGames?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["playerStats"]>

  export type PlayerStatsSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    userId?: boolean
    wins?: boolean
    losses?: boolean
    draws?: boolean
    totalGames?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["playerStats"]>

  export type PlayerStatsSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    userId?: boolean
    wins?: boolean
    losses?: boolean
    draws?: boolean
    totalGames?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["playerStats"]>

  export type PlayerStatsSelectScalar = {
    userId?: boolean
    wins?: boolean
    losses?: boolean
    draws?: boolean
    totalGames?: boolean
  }

  export type PlayerStatsOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"userId" | "wins" | "losses" | "draws" | "totalGames", ExtArgs["result"]["playerStats"]>
  export type PlayerStatsInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type PlayerStatsIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type PlayerStatsIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $PlayerStatsPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "PlayerStats"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      userId: string
      wins: number
      losses: number
      draws: number
      totalGames: number
    }, ExtArgs["result"]["playerStats"]>
    composites: {}
  }

  type PlayerStatsGetPayload<S extends boolean | null | undefined | PlayerStatsDefaultArgs> = $Result.GetResult<Prisma.$PlayerStatsPayload, S>

  type PlayerStatsCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<PlayerStatsFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: PlayerStatsCountAggregateInputType | true
    }

  export interface PlayerStatsDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['PlayerStats'], meta: { name: 'PlayerStats' } }
    /**
     * Find zero or one PlayerStats that matches the filter.
     * @param {PlayerStatsFindUniqueArgs} args - Arguments to find a PlayerStats
     * @example
     * // Get one PlayerStats
     * const playerStats = await prisma.playerStats.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends PlayerStatsFindUniqueArgs>(args: SelectSubset<T, PlayerStatsFindUniqueArgs<ExtArgs>>): Prisma__PlayerStatsClient<$Result.GetResult<Prisma.$PlayerStatsPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one PlayerStats that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {PlayerStatsFindUniqueOrThrowArgs} args - Arguments to find a PlayerStats
     * @example
     * // Get one PlayerStats
     * const playerStats = await prisma.playerStats.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends PlayerStatsFindUniqueOrThrowArgs>(args: SelectSubset<T, PlayerStatsFindUniqueOrThrowArgs<ExtArgs>>): Prisma__PlayerStatsClient<$Result.GetResult<Prisma.$PlayerStatsPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first PlayerStats that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlayerStatsFindFirstArgs} args - Arguments to find a PlayerStats
     * @example
     * // Get one PlayerStats
     * const playerStats = await prisma.playerStats.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends PlayerStatsFindFirstArgs>(args?: SelectSubset<T, PlayerStatsFindFirstArgs<ExtArgs>>): Prisma__PlayerStatsClient<$Result.GetResult<Prisma.$PlayerStatsPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first PlayerStats that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlayerStatsFindFirstOrThrowArgs} args - Arguments to find a PlayerStats
     * @example
     * // Get one PlayerStats
     * const playerStats = await prisma.playerStats.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends PlayerStatsFindFirstOrThrowArgs>(args?: SelectSubset<T, PlayerStatsFindFirstOrThrowArgs<ExtArgs>>): Prisma__PlayerStatsClient<$Result.GetResult<Prisma.$PlayerStatsPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more PlayerStats that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlayerStatsFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all PlayerStats
     * const playerStats = await prisma.playerStats.findMany()
     * 
     * // Get first 10 PlayerStats
     * const playerStats = await prisma.playerStats.findMany({ take: 10 })
     * 
     * // Only select the `userId`
     * const playerStatsWithUserIdOnly = await prisma.playerStats.findMany({ select: { userId: true } })
     * 
     */
    findMany<T extends PlayerStatsFindManyArgs>(args?: SelectSubset<T, PlayerStatsFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PlayerStatsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a PlayerStats.
     * @param {PlayerStatsCreateArgs} args - Arguments to create a PlayerStats.
     * @example
     * // Create one PlayerStats
     * const PlayerStats = await prisma.playerStats.create({
     *   data: {
     *     // ... data to create a PlayerStats
     *   }
     * })
     * 
     */
    create<T extends PlayerStatsCreateArgs>(args: SelectSubset<T, PlayerStatsCreateArgs<ExtArgs>>): Prisma__PlayerStatsClient<$Result.GetResult<Prisma.$PlayerStatsPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many PlayerStats.
     * @param {PlayerStatsCreateManyArgs} args - Arguments to create many PlayerStats.
     * @example
     * // Create many PlayerStats
     * const playerStats = await prisma.playerStats.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends PlayerStatsCreateManyArgs>(args?: SelectSubset<T, PlayerStatsCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many PlayerStats and returns the data saved in the database.
     * @param {PlayerStatsCreateManyAndReturnArgs} args - Arguments to create many PlayerStats.
     * @example
     * // Create many PlayerStats
     * const playerStats = await prisma.playerStats.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many PlayerStats and only return the `userId`
     * const playerStatsWithUserIdOnly = await prisma.playerStats.createManyAndReturn({
     *   select: { userId: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends PlayerStatsCreateManyAndReturnArgs>(args?: SelectSubset<T, PlayerStatsCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PlayerStatsPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a PlayerStats.
     * @param {PlayerStatsDeleteArgs} args - Arguments to delete one PlayerStats.
     * @example
     * // Delete one PlayerStats
     * const PlayerStats = await prisma.playerStats.delete({
     *   where: {
     *     // ... filter to delete one PlayerStats
     *   }
     * })
     * 
     */
    delete<T extends PlayerStatsDeleteArgs>(args: SelectSubset<T, PlayerStatsDeleteArgs<ExtArgs>>): Prisma__PlayerStatsClient<$Result.GetResult<Prisma.$PlayerStatsPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one PlayerStats.
     * @param {PlayerStatsUpdateArgs} args - Arguments to update one PlayerStats.
     * @example
     * // Update one PlayerStats
     * const playerStats = await prisma.playerStats.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends PlayerStatsUpdateArgs>(args: SelectSubset<T, PlayerStatsUpdateArgs<ExtArgs>>): Prisma__PlayerStatsClient<$Result.GetResult<Prisma.$PlayerStatsPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more PlayerStats.
     * @param {PlayerStatsDeleteManyArgs} args - Arguments to filter PlayerStats to delete.
     * @example
     * // Delete a few PlayerStats
     * const { count } = await prisma.playerStats.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends PlayerStatsDeleteManyArgs>(args?: SelectSubset<T, PlayerStatsDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more PlayerStats.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlayerStatsUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many PlayerStats
     * const playerStats = await prisma.playerStats.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends PlayerStatsUpdateManyArgs>(args: SelectSubset<T, PlayerStatsUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more PlayerStats and returns the data updated in the database.
     * @param {PlayerStatsUpdateManyAndReturnArgs} args - Arguments to update many PlayerStats.
     * @example
     * // Update many PlayerStats
     * const playerStats = await prisma.playerStats.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more PlayerStats and only return the `userId`
     * const playerStatsWithUserIdOnly = await prisma.playerStats.updateManyAndReturn({
     *   select: { userId: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends PlayerStatsUpdateManyAndReturnArgs>(args: SelectSubset<T, PlayerStatsUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PlayerStatsPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one PlayerStats.
     * @param {PlayerStatsUpsertArgs} args - Arguments to update or create a PlayerStats.
     * @example
     * // Update or create a PlayerStats
     * const playerStats = await prisma.playerStats.upsert({
     *   create: {
     *     // ... data to create a PlayerStats
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the PlayerStats we want to update
     *   }
     * })
     */
    upsert<T extends PlayerStatsUpsertArgs>(args: SelectSubset<T, PlayerStatsUpsertArgs<ExtArgs>>): Prisma__PlayerStatsClient<$Result.GetResult<Prisma.$PlayerStatsPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of PlayerStats.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlayerStatsCountArgs} args - Arguments to filter PlayerStats to count.
     * @example
     * // Count the number of PlayerStats
     * const count = await prisma.playerStats.count({
     *   where: {
     *     // ... the filter for the PlayerStats we want to count
     *   }
     * })
    **/
    count<T extends PlayerStatsCountArgs>(
      args?: Subset<T, PlayerStatsCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], PlayerStatsCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a PlayerStats.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlayerStatsAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends PlayerStatsAggregateArgs>(args: Subset<T, PlayerStatsAggregateArgs>): Prisma.PrismaPromise<GetPlayerStatsAggregateType<T>>

    /**
     * Group by PlayerStats.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlayerStatsGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends PlayerStatsGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: PlayerStatsGroupByArgs['orderBy'] }
        : { orderBy?: PlayerStatsGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, PlayerStatsGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPlayerStatsGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the PlayerStats model
   */
  readonly fields: PlayerStatsFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for PlayerStats.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__PlayerStatsClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the PlayerStats model
   */
  interface PlayerStatsFieldRefs {
    readonly userId: FieldRef<"PlayerStats", 'String'>
    readonly wins: FieldRef<"PlayerStats", 'Int'>
    readonly losses: FieldRef<"PlayerStats", 'Int'>
    readonly draws: FieldRef<"PlayerStats", 'Int'>
    readonly totalGames: FieldRef<"PlayerStats", 'Int'>
  }
    

  // Custom InputTypes
  /**
   * PlayerStats findUnique
   */
  export type PlayerStatsFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlayerStats
     */
    select?: PlayerStatsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PlayerStats
     */
    omit?: PlayerStatsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlayerStatsInclude<ExtArgs> | null
    /**
     * Filter, which PlayerStats to fetch.
     */
    where: PlayerStatsWhereUniqueInput
  }

  /**
   * PlayerStats findUniqueOrThrow
   */
  export type PlayerStatsFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlayerStats
     */
    select?: PlayerStatsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PlayerStats
     */
    omit?: PlayerStatsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlayerStatsInclude<ExtArgs> | null
    /**
     * Filter, which PlayerStats to fetch.
     */
    where: PlayerStatsWhereUniqueInput
  }

  /**
   * PlayerStats findFirst
   */
  export type PlayerStatsFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlayerStats
     */
    select?: PlayerStatsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PlayerStats
     */
    omit?: PlayerStatsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlayerStatsInclude<ExtArgs> | null
    /**
     * Filter, which PlayerStats to fetch.
     */
    where?: PlayerStatsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PlayerStats to fetch.
     */
    orderBy?: PlayerStatsOrderByWithRelationInput | PlayerStatsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PlayerStats.
     */
    cursor?: PlayerStatsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PlayerStats from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PlayerStats.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PlayerStats.
     */
    distinct?: PlayerStatsScalarFieldEnum | PlayerStatsScalarFieldEnum[]
  }

  /**
   * PlayerStats findFirstOrThrow
   */
  export type PlayerStatsFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlayerStats
     */
    select?: PlayerStatsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PlayerStats
     */
    omit?: PlayerStatsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlayerStatsInclude<ExtArgs> | null
    /**
     * Filter, which PlayerStats to fetch.
     */
    where?: PlayerStatsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PlayerStats to fetch.
     */
    orderBy?: PlayerStatsOrderByWithRelationInput | PlayerStatsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PlayerStats.
     */
    cursor?: PlayerStatsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PlayerStats from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PlayerStats.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PlayerStats.
     */
    distinct?: PlayerStatsScalarFieldEnum | PlayerStatsScalarFieldEnum[]
  }

  /**
   * PlayerStats findMany
   */
  export type PlayerStatsFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlayerStats
     */
    select?: PlayerStatsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PlayerStats
     */
    omit?: PlayerStatsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlayerStatsInclude<ExtArgs> | null
    /**
     * Filter, which PlayerStats to fetch.
     */
    where?: PlayerStatsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PlayerStats to fetch.
     */
    orderBy?: PlayerStatsOrderByWithRelationInput | PlayerStatsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing PlayerStats.
     */
    cursor?: PlayerStatsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PlayerStats from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PlayerStats.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PlayerStats.
     */
    distinct?: PlayerStatsScalarFieldEnum | PlayerStatsScalarFieldEnum[]
  }

  /**
   * PlayerStats create
   */
  export type PlayerStatsCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlayerStats
     */
    select?: PlayerStatsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PlayerStats
     */
    omit?: PlayerStatsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlayerStatsInclude<ExtArgs> | null
    /**
     * The data needed to create a PlayerStats.
     */
    data: XOR<PlayerStatsCreateInput, PlayerStatsUncheckedCreateInput>
  }

  /**
   * PlayerStats createMany
   */
  export type PlayerStatsCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many PlayerStats.
     */
    data: PlayerStatsCreateManyInput | PlayerStatsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * PlayerStats createManyAndReturn
   */
  export type PlayerStatsCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlayerStats
     */
    select?: PlayerStatsSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the PlayerStats
     */
    omit?: PlayerStatsOmit<ExtArgs> | null
    /**
     * The data used to create many PlayerStats.
     */
    data: PlayerStatsCreateManyInput | PlayerStatsCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlayerStatsIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * PlayerStats update
   */
  export type PlayerStatsUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlayerStats
     */
    select?: PlayerStatsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PlayerStats
     */
    omit?: PlayerStatsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlayerStatsInclude<ExtArgs> | null
    /**
     * The data needed to update a PlayerStats.
     */
    data: XOR<PlayerStatsUpdateInput, PlayerStatsUncheckedUpdateInput>
    /**
     * Choose, which PlayerStats to update.
     */
    where: PlayerStatsWhereUniqueInput
  }

  /**
   * PlayerStats updateMany
   */
  export type PlayerStatsUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update PlayerStats.
     */
    data: XOR<PlayerStatsUpdateManyMutationInput, PlayerStatsUncheckedUpdateManyInput>
    /**
     * Filter which PlayerStats to update
     */
    where?: PlayerStatsWhereInput
    /**
     * Limit how many PlayerStats to update.
     */
    limit?: number
  }

  /**
   * PlayerStats updateManyAndReturn
   */
  export type PlayerStatsUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlayerStats
     */
    select?: PlayerStatsSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the PlayerStats
     */
    omit?: PlayerStatsOmit<ExtArgs> | null
    /**
     * The data used to update PlayerStats.
     */
    data: XOR<PlayerStatsUpdateManyMutationInput, PlayerStatsUncheckedUpdateManyInput>
    /**
     * Filter which PlayerStats to update
     */
    where?: PlayerStatsWhereInput
    /**
     * Limit how many PlayerStats to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlayerStatsIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * PlayerStats upsert
   */
  export type PlayerStatsUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlayerStats
     */
    select?: PlayerStatsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PlayerStats
     */
    omit?: PlayerStatsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlayerStatsInclude<ExtArgs> | null
    /**
     * The filter to search for the PlayerStats to update in case it exists.
     */
    where: PlayerStatsWhereUniqueInput
    /**
     * In case the PlayerStats found by the `where` argument doesn't exist, create a new PlayerStats with this data.
     */
    create: XOR<PlayerStatsCreateInput, PlayerStatsUncheckedCreateInput>
    /**
     * In case the PlayerStats was found with the provided `where` argument, update it with this data.
     */
    update: XOR<PlayerStatsUpdateInput, PlayerStatsUncheckedUpdateInput>
  }

  /**
   * PlayerStats delete
   */
  export type PlayerStatsDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlayerStats
     */
    select?: PlayerStatsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PlayerStats
     */
    omit?: PlayerStatsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlayerStatsInclude<ExtArgs> | null
    /**
     * Filter which PlayerStats to delete.
     */
    where: PlayerStatsWhereUniqueInput
  }

  /**
   * PlayerStats deleteMany
   */
  export type PlayerStatsDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PlayerStats to delete
     */
    where?: PlayerStatsWhereInput
    /**
     * Limit how many PlayerStats to delete.
     */
    limit?: number
  }

  /**
   * PlayerStats without action
   */
  export type PlayerStatsDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlayerStats
     */
    select?: PlayerStatsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PlayerStats
     */
    omit?: PlayerStatsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlayerStatsInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const UserScalarFieldEnum: {
    id: 'id',
    email: 'email',
    username: 'username',
    creditBalance: 'creditBalance',
    purchasedShipCount: 'purchasedShipCount',
    lobbiesCreatedCount: 'lobbiesCreatedCount',
    kickCount: 'kickCount',
    kickTimeoutUntil: 'kickTimeoutUntil',
    tutorialCompleted: 'tutorialCompleted',
    tutorialPath: 'tutorialPath',
    createdAt: 'createdAt'
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const ShipScalarFieldEnum: {
    id: 'id',
    ownerId: 'ownerId',
    name: 'name',
    equipment: 'equipment',
    traits: 'traits',
    cost: 'cost',
    costsVersion: 'costsVersion',
    isFree: 'isFree',
    modifiedCount: 'modifiedCount',
    shiny: 'shiny',
    constructed: 'constructed',
    inFleet: 'inFleet',
    destroyed: 'destroyed',
    shipsDestroyed: 'shipsDestroyed',
    destroyedAt: 'destroyedAt',
    createdAt: 'createdAt'
  };

  export type ShipScalarFieldEnum = (typeof ShipScalarFieldEnum)[keyof typeof ShipScalarFieldEnum]


  export const FleetScalarFieldEnum: {
    id: 'id',
    ownerId: 'ownerId',
    lobbyId: 'lobbyId',
    shipIds: 'shipIds',
    totalCost: 'totalCost',
    isComplete: 'isComplete',
    startingPositions: 'startingPositions',
    createdAt: 'createdAt'
  };

  export type FleetScalarFieldEnum = (typeof FleetScalarFieldEnum)[keyof typeof FleetScalarFieldEnum]


  export const LobbyScalarFieldEnum: {
    id: 'id',
    creatorId: 'creatorId',
    joinerId: 'joinerId',
    reservedJoinerId: 'reservedJoinerId',
    mapId: 'mapId',
    status: 'status',
    costLimit: 'costLimit',
    turnTimeSeconds: 'turnTimeSeconds',
    maxScore: 'maxScore',
    creatorGoesFirst: 'creatorGoesFirst',
    isAiGame: 'isAiGame',
    aiDifficulty: 'aiDifficulty',
    createdAt: 'createdAt',
    joinedAt: 'joinedAt',
    joinerFleetSetAt: 'joinerFleetSetAt'
  };

  export type LobbyScalarFieldEnum = (typeof LobbyScalarFieldEnum)[keyof typeof LobbyScalarFieldEnum]


  export const GameScalarFieldEnum: {
    id: 'id',
    lobbyId: 'lobbyId',
    player1Id: 'player1Id',
    player2Id: 'player2Id',
    state: 'state',
    initialState: 'initialState',
    currentTurn: 'currentTurn',
    currentRound: 'currentRound',
    phase: 'phase',
    winnerId: 'winnerId',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type GameScalarFieldEnum = (typeof GameScalarFieldEnum)[keyof typeof GameScalarFieldEnum]


  export const GameTurnScalarFieldEnum: {
    id: 'id',
    gameId: 'gameId',
    playerId: 'playerId',
    round: 'round',
    actions: 'actions',
    snapshot: 'snapshot',
    submittedAt: 'submittedAt'
  };

  export type GameTurnScalarFieldEnum = (typeof GameTurnScalarFieldEnum)[keyof typeof GameTurnScalarFieldEnum]


  export const MapScalarFieldEnum: {
    id: 'id',
    name: 'name',
    gridWidth: 'gridWidth',
    gridHeight: 'gridHeight',
    blockedTiles: 'blockedTiles',
    scoringTiles: 'scoringTiles',
    createdAt: 'createdAt'
  };

  export type MapScalarFieldEnum = (typeof MapScalarFieldEnum)[keyof typeof MapScalarFieldEnum]


  export const ConfigScalarFieldEnum: {
    key: 'key',
    value: 'value',
    updatedAt: 'updatedAt'
  };

  export type ConfigScalarFieldEnum = (typeof ConfigScalarFieldEnum)[keyof typeof ConfigScalarFieldEnum]


  export const PlayerStatsScalarFieldEnum: {
    userId: 'userId',
    wins: 'wins',
    losses: 'losses',
    draws: 'draws',
    totalGames: 'totalGames'
  };

  export type PlayerStatsScalarFieldEnum = (typeof PlayerStatsScalarFieldEnum)[keyof typeof PlayerStatsScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const JsonNullValueInput: {
    JsonNull: typeof JsonNull
  };

  export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput]


  export const NullableJsonNullValueInput: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull
  };

  export type NullableJsonNullValueInput = (typeof NullableJsonNullValueInput)[keyof typeof NullableJsonNullValueInput]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'QueryMode'
   */
  export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>
    


  /**
   * Reference to a field of type 'LobbyStatus'
   */
  export type EnumLobbyStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'LobbyStatus'>
    


  /**
   * Reference to a field of type 'LobbyStatus[]'
   */
  export type ListEnumLobbyStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'LobbyStatus[]'>
    


  /**
   * Reference to a field of type 'GamePhase'
   */
  export type EnumGamePhaseFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'GamePhase'>
    


  /**
   * Reference to a field of type 'GamePhase[]'
   */
  export type ListEnumGamePhaseFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'GamePhase[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    id?: StringFilter<"User"> | string
    email?: StringFilter<"User"> | string
    username?: StringNullableFilter<"User"> | string | null
    creditBalance?: IntFilter<"User"> | number
    purchasedShipCount?: IntFilter<"User"> | number
    lobbiesCreatedCount?: IntFilter<"User"> | number
    kickCount?: IntFilter<"User"> | number
    kickTimeoutUntil?: DateTimeNullableFilter<"User"> | Date | string | null
    tutorialCompleted?: BoolFilter<"User"> | boolean
    tutorialPath?: StringNullableFilter<"User"> | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    ships?: ShipListRelationFilter
    lobbiesCreated?: LobbyListRelationFilter
    lobbiesJoined?: LobbyListRelationFilter
    lobbiesReserved?: LobbyListRelationFilter
    gamesAsPlayer1?: GameListRelationFilter
    gamesAsPlayer2?: GameListRelationFilter
    fleets?: FleetListRelationFilter
    stats?: XOR<PlayerStatsNullableScalarRelationFilter, PlayerStatsWhereInput> | null
  }

  export type UserOrderByWithRelationInput = {
    id?: SortOrder
    email?: SortOrder
    username?: SortOrderInput | SortOrder
    creditBalance?: SortOrder
    purchasedShipCount?: SortOrder
    lobbiesCreatedCount?: SortOrder
    kickCount?: SortOrder
    kickTimeoutUntil?: SortOrderInput | SortOrder
    tutorialCompleted?: SortOrder
    tutorialPath?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    ships?: ShipOrderByRelationAggregateInput
    lobbiesCreated?: LobbyOrderByRelationAggregateInput
    lobbiesJoined?: LobbyOrderByRelationAggregateInput
    lobbiesReserved?: LobbyOrderByRelationAggregateInput
    gamesAsPlayer1?: GameOrderByRelationAggregateInput
    gamesAsPlayer2?: GameOrderByRelationAggregateInput
    fleets?: FleetOrderByRelationAggregateInput
    stats?: PlayerStatsOrderByWithRelationInput
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    email?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    username?: StringNullableFilter<"User"> | string | null
    creditBalance?: IntFilter<"User"> | number
    purchasedShipCount?: IntFilter<"User"> | number
    lobbiesCreatedCount?: IntFilter<"User"> | number
    kickCount?: IntFilter<"User"> | number
    kickTimeoutUntil?: DateTimeNullableFilter<"User"> | Date | string | null
    tutorialCompleted?: BoolFilter<"User"> | boolean
    tutorialPath?: StringNullableFilter<"User"> | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    ships?: ShipListRelationFilter
    lobbiesCreated?: LobbyListRelationFilter
    lobbiesJoined?: LobbyListRelationFilter
    lobbiesReserved?: LobbyListRelationFilter
    gamesAsPlayer1?: GameListRelationFilter
    gamesAsPlayer2?: GameListRelationFilter
    fleets?: FleetListRelationFilter
    stats?: XOR<PlayerStatsNullableScalarRelationFilter, PlayerStatsWhereInput> | null
  }, "id" | "email">

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder
    email?: SortOrder
    username?: SortOrderInput | SortOrder
    creditBalance?: SortOrder
    purchasedShipCount?: SortOrder
    lobbiesCreatedCount?: SortOrder
    kickCount?: SortOrder
    kickTimeoutUntil?: SortOrderInput | SortOrder
    tutorialCompleted?: SortOrder
    tutorialPath?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: UserCountOrderByAggregateInput
    _avg?: UserAvgOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
    _sum?: UserSumOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"User"> | string
    email?: StringWithAggregatesFilter<"User"> | string
    username?: StringNullableWithAggregatesFilter<"User"> | string | null
    creditBalance?: IntWithAggregatesFilter<"User"> | number
    purchasedShipCount?: IntWithAggregatesFilter<"User"> | number
    lobbiesCreatedCount?: IntWithAggregatesFilter<"User"> | number
    kickCount?: IntWithAggregatesFilter<"User"> | number
    kickTimeoutUntil?: DateTimeNullableWithAggregatesFilter<"User"> | Date | string | null
    tutorialCompleted?: BoolWithAggregatesFilter<"User"> | boolean
    tutorialPath?: StringNullableWithAggregatesFilter<"User"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
  }

  export type ShipWhereInput = {
    AND?: ShipWhereInput | ShipWhereInput[]
    OR?: ShipWhereInput[]
    NOT?: ShipWhereInput | ShipWhereInput[]
    id?: IntFilter<"Ship"> | number
    ownerId?: StringFilter<"Ship"> | string
    name?: StringFilter<"Ship"> | string
    equipment?: JsonFilter<"Ship">
    traits?: JsonFilter<"Ship">
    cost?: IntFilter<"Ship"> | number
    costsVersion?: IntFilter<"Ship"> | number
    isFree?: BoolFilter<"Ship"> | boolean
    modifiedCount?: IntFilter<"Ship"> | number
    shiny?: BoolFilter<"Ship"> | boolean
    constructed?: BoolFilter<"Ship"> | boolean
    inFleet?: BoolFilter<"Ship"> | boolean
    destroyed?: BoolFilter<"Ship"> | boolean
    shipsDestroyed?: IntFilter<"Ship"> | number
    destroyedAt?: DateTimeNullableFilter<"Ship"> | Date | string | null
    createdAt?: DateTimeFilter<"Ship"> | Date | string
    owner?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type ShipOrderByWithRelationInput = {
    id?: SortOrder
    ownerId?: SortOrder
    name?: SortOrder
    equipment?: SortOrder
    traits?: SortOrder
    cost?: SortOrder
    costsVersion?: SortOrder
    isFree?: SortOrder
    modifiedCount?: SortOrder
    shiny?: SortOrder
    constructed?: SortOrder
    inFleet?: SortOrder
    destroyed?: SortOrder
    shipsDestroyed?: SortOrder
    destroyedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    owner?: UserOrderByWithRelationInput
  }

  export type ShipWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: ShipWhereInput | ShipWhereInput[]
    OR?: ShipWhereInput[]
    NOT?: ShipWhereInput | ShipWhereInput[]
    ownerId?: StringFilter<"Ship"> | string
    name?: StringFilter<"Ship"> | string
    equipment?: JsonFilter<"Ship">
    traits?: JsonFilter<"Ship">
    cost?: IntFilter<"Ship"> | number
    costsVersion?: IntFilter<"Ship"> | number
    isFree?: BoolFilter<"Ship"> | boolean
    modifiedCount?: IntFilter<"Ship"> | number
    shiny?: BoolFilter<"Ship"> | boolean
    constructed?: BoolFilter<"Ship"> | boolean
    inFleet?: BoolFilter<"Ship"> | boolean
    destroyed?: BoolFilter<"Ship"> | boolean
    shipsDestroyed?: IntFilter<"Ship"> | number
    destroyedAt?: DateTimeNullableFilter<"Ship"> | Date | string | null
    createdAt?: DateTimeFilter<"Ship"> | Date | string
    owner?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "id">

  export type ShipOrderByWithAggregationInput = {
    id?: SortOrder
    ownerId?: SortOrder
    name?: SortOrder
    equipment?: SortOrder
    traits?: SortOrder
    cost?: SortOrder
    costsVersion?: SortOrder
    isFree?: SortOrder
    modifiedCount?: SortOrder
    shiny?: SortOrder
    constructed?: SortOrder
    inFleet?: SortOrder
    destroyed?: SortOrder
    shipsDestroyed?: SortOrder
    destroyedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: ShipCountOrderByAggregateInput
    _avg?: ShipAvgOrderByAggregateInput
    _max?: ShipMaxOrderByAggregateInput
    _min?: ShipMinOrderByAggregateInput
    _sum?: ShipSumOrderByAggregateInput
  }

  export type ShipScalarWhereWithAggregatesInput = {
    AND?: ShipScalarWhereWithAggregatesInput | ShipScalarWhereWithAggregatesInput[]
    OR?: ShipScalarWhereWithAggregatesInput[]
    NOT?: ShipScalarWhereWithAggregatesInput | ShipScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Ship"> | number
    ownerId?: StringWithAggregatesFilter<"Ship"> | string
    name?: StringWithAggregatesFilter<"Ship"> | string
    equipment?: JsonWithAggregatesFilter<"Ship">
    traits?: JsonWithAggregatesFilter<"Ship">
    cost?: IntWithAggregatesFilter<"Ship"> | number
    costsVersion?: IntWithAggregatesFilter<"Ship"> | number
    isFree?: BoolWithAggregatesFilter<"Ship"> | boolean
    modifiedCount?: IntWithAggregatesFilter<"Ship"> | number
    shiny?: BoolWithAggregatesFilter<"Ship"> | boolean
    constructed?: BoolWithAggregatesFilter<"Ship"> | boolean
    inFleet?: BoolWithAggregatesFilter<"Ship"> | boolean
    destroyed?: BoolWithAggregatesFilter<"Ship"> | boolean
    shipsDestroyed?: IntWithAggregatesFilter<"Ship"> | number
    destroyedAt?: DateTimeNullableWithAggregatesFilter<"Ship"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Ship"> | Date | string
  }

  export type FleetWhereInput = {
    AND?: FleetWhereInput | FleetWhereInput[]
    OR?: FleetWhereInput[]
    NOT?: FleetWhereInput | FleetWhereInput[]
    id?: IntFilter<"Fleet"> | number
    ownerId?: StringFilter<"Fleet"> | string
    lobbyId?: IntFilter<"Fleet"> | number
    shipIds?: IntNullableListFilter<"Fleet">
    totalCost?: IntFilter<"Fleet"> | number
    isComplete?: BoolFilter<"Fleet"> | boolean
    startingPositions?: JsonNullableFilter<"Fleet">
    createdAt?: DateTimeFilter<"Fleet"> | Date | string
    owner?: XOR<UserScalarRelationFilter, UserWhereInput>
    lobby?: XOR<LobbyScalarRelationFilter, LobbyWhereInput>
  }

  export type FleetOrderByWithRelationInput = {
    id?: SortOrder
    ownerId?: SortOrder
    lobbyId?: SortOrder
    shipIds?: SortOrder
    totalCost?: SortOrder
    isComplete?: SortOrder
    startingPositions?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    owner?: UserOrderByWithRelationInput
    lobby?: LobbyOrderByWithRelationInput
  }

  export type FleetWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: FleetWhereInput | FleetWhereInput[]
    OR?: FleetWhereInput[]
    NOT?: FleetWhereInput | FleetWhereInput[]
    ownerId?: StringFilter<"Fleet"> | string
    lobbyId?: IntFilter<"Fleet"> | number
    shipIds?: IntNullableListFilter<"Fleet">
    totalCost?: IntFilter<"Fleet"> | number
    isComplete?: BoolFilter<"Fleet"> | boolean
    startingPositions?: JsonNullableFilter<"Fleet">
    createdAt?: DateTimeFilter<"Fleet"> | Date | string
    owner?: XOR<UserScalarRelationFilter, UserWhereInput>
    lobby?: XOR<LobbyScalarRelationFilter, LobbyWhereInput>
  }, "id">

  export type FleetOrderByWithAggregationInput = {
    id?: SortOrder
    ownerId?: SortOrder
    lobbyId?: SortOrder
    shipIds?: SortOrder
    totalCost?: SortOrder
    isComplete?: SortOrder
    startingPositions?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: FleetCountOrderByAggregateInput
    _avg?: FleetAvgOrderByAggregateInput
    _max?: FleetMaxOrderByAggregateInput
    _min?: FleetMinOrderByAggregateInput
    _sum?: FleetSumOrderByAggregateInput
  }

  export type FleetScalarWhereWithAggregatesInput = {
    AND?: FleetScalarWhereWithAggregatesInput | FleetScalarWhereWithAggregatesInput[]
    OR?: FleetScalarWhereWithAggregatesInput[]
    NOT?: FleetScalarWhereWithAggregatesInput | FleetScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Fleet"> | number
    ownerId?: StringWithAggregatesFilter<"Fleet"> | string
    lobbyId?: IntWithAggregatesFilter<"Fleet"> | number
    shipIds?: IntNullableListFilter<"Fleet">
    totalCost?: IntWithAggregatesFilter<"Fleet"> | number
    isComplete?: BoolWithAggregatesFilter<"Fleet"> | boolean
    startingPositions?: JsonNullableWithAggregatesFilter<"Fleet">
    createdAt?: DateTimeWithAggregatesFilter<"Fleet"> | Date | string
  }

  export type LobbyWhereInput = {
    AND?: LobbyWhereInput | LobbyWhereInput[]
    OR?: LobbyWhereInput[]
    NOT?: LobbyWhereInput | LobbyWhereInput[]
    id?: IntFilter<"Lobby"> | number
    creatorId?: StringFilter<"Lobby"> | string
    joinerId?: StringNullableFilter<"Lobby"> | string | null
    reservedJoinerId?: StringNullableFilter<"Lobby"> | string | null
    mapId?: IntNullableFilter<"Lobby"> | number | null
    status?: EnumLobbyStatusFilter<"Lobby"> | $Enums.LobbyStatus
    costLimit?: IntFilter<"Lobby"> | number
    turnTimeSeconds?: IntFilter<"Lobby"> | number
    maxScore?: IntFilter<"Lobby"> | number
    creatorGoesFirst?: BoolNullableFilter<"Lobby"> | boolean | null
    isAiGame?: BoolFilter<"Lobby"> | boolean
    aiDifficulty?: StringNullableFilter<"Lobby"> | string | null
    createdAt?: DateTimeFilter<"Lobby"> | Date | string
    joinedAt?: DateTimeNullableFilter<"Lobby"> | Date | string | null
    joinerFleetSetAt?: DateTimeNullableFilter<"Lobby"> | Date | string | null
    creator?: XOR<UserScalarRelationFilter, UserWhereInput>
    joiner?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
    reservedJoiner?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
    map?: XOR<MapNullableScalarRelationFilter, MapWhereInput> | null
    fleets?: FleetListRelationFilter
    game?: XOR<GameNullableScalarRelationFilter, GameWhereInput> | null
  }

  export type LobbyOrderByWithRelationInput = {
    id?: SortOrder
    creatorId?: SortOrder
    joinerId?: SortOrderInput | SortOrder
    reservedJoinerId?: SortOrderInput | SortOrder
    mapId?: SortOrderInput | SortOrder
    status?: SortOrder
    costLimit?: SortOrder
    turnTimeSeconds?: SortOrder
    maxScore?: SortOrder
    creatorGoesFirst?: SortOrderInput | SortOrder
    isAiGame?: SortOrder
    aiDifficulty?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    joinedAt?: SortOrderInput | SortOrder
    joinerFleetSetAt?: SortOrderInput | SortOrder
    creator?: UserOrderByWithRelationInput
    joiner?: UserOrderByWithRelationInput
    reservedJoiner?: UserOrderByWithRelationInput
    map?: MapOrderByWithRelationInput
    fleets?: FleetOrderByRelationAggregateInput
    game?: GameOrderByWithRelationInput
  }

  export type LobbyWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: LobbyWhereInput | LobbyWhereInput[]
    OR?: LobbyWhereInput[]
    NOT?: LobbyWhereInput | LobbyWhereInput[]
    creatorId?: StringFilter<"Lobby"> | string
    joinerId?: StringNullableFilter<"Lobby"> | string | null
    reservedJoinerId?: StringNullableFilter<"Lobby"> | string | null
    mapId?: IntNullableFilter<"Lobby"> | number | null
    status?: EnumLobbyStatusFilter<"Lobby"> | $Enums.LobbyStatus
    costLimit?: IntFilter<"Lobby"> | number
    turnTimeSeconds?: IntFilter<"Lobby"> | number
    maxScore?: IntFilter<"Lobby"> | number
    creatorGoesFirst?: BoolNullableFilter<"Lobby"> | boolean | null
    isAiGame?: BoolFilter<"Lobby"> | boolean
    aiDifficulty?: StringNullableFilter<"Lobby"> | string | null
    createdAt?: DateTimeFilter<"Lobby"> | Date | string
    joinedAt?: DateTimeNullableFilter<"Lobby"> | Date | string | null
    joinerFleetSetAt?: DateTimeNullableFilter<"Lobby"> | Date | string | null
    creator?: XOR<UserScalarRelationFilter, UserWhereInput>
    joiner?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
    reservedJoiner?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
    map?: XOR<MapNullableScalarRelationFilter, MapWhereInput> | null
    fleets?: FleetListRelationFilter
    game?: XOR<GameNullableScalarRelationFilter, GameWhereInput> | null
  }, "id">

  export type LobbyOrderByWithAggregationInput = {
    id?: SortOrder
    creatorId?: SortOrder
    joinerId?: SortOrderInput | SortOrder
    reservedJoinerId?: SortOrderInput | SortOrder
    mapId?: SortOrderInput | SortOrder
    status?: SortOrder
    costLimit?: SortOrder
    turnTimeSeconds?: SortOrder
    maxScore?: SortOrder
    creatorGoesFirst?: SortOrderInput | SortOrder
    isAiGame?: SortOrder
    aiDifficulty?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    joinedAt?: SortOrderInput | SortOrder
    joinerFleetSetAt?: SortOrderInput | SortOrder
    _count?: LobbyCountOrderByAggregateInput
    _avg?: LobbyAvgOrderByAggregateInput
    _max?: LobbyMaxOrderByAggregateInput
    _min?: LobbyMinOrderByAggregateInput
    _sum?: LobbySumOrderByAggregateInput
  }

  export type LobbyScalarWhereWithAggregatesInput = {
    AND?: LobbyScalarWhereWithAggregatesInput | LobbyScalarWhereWithAggregatesInput[]
    OR?: LobbyScalarWhereWithAggregatesInput[]
    NOT?: LobbyScalarWhereWithAggregatesInput | LobbyScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Lobby"> | number
    creatorId?: StringWithAggregatesFilter<"Lobby"> | string
    joinerId?: StringNullableWithAggregatesFilter<"Lobby"> | string | null
    reservedJoinerId?: StringNullableWithAggregatesFilter<"Lobby"> | string | null
    mapId?: IntNullableWithAggregatesFilter<"Lobby"> | number | null
    status?: EnumLobbyStatusWithAggregatesFilter<"Lobby"> | $Enums.LobbyStatus
    costLimit?: IntWithAggregatesFilter<"Lobby"> | number
    turnTimeSeconds?: IntWithAggregatesFilter<"Lobby"> | number
    maxScore?: IntWithAggregatesFilter<"Lobby"> | number
    creatorGoesFirst?: BoolNullableWithAggregatesFilter<"Lobby"> | boolean | null
    isAiGame?: BoolWithAggregatesFilter<"Lobby"> | boolean
    aiDifficulty?: StringNullableWithAggregatesFilter<"Lobby"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Lobby"> | Date | string
    joinedAt?: DateTimeNullableWithAggregatesFilter<"Lobby"> | Date | string | null
    joinerFleetSetAt?: DateTimeNullableWithAggregatesFilter<"Lobby"> | Date | string | null
  }

  export type GameWhereInput = {
    AND?: GameWhereInput | GameWhereInput[]
    OR?: GameWhereInput[]
    NOT?: GameWhereInput | GameWhereInput[]
    id?: IntFilter<"Game"> | number
    lobbyId?: IntFilter<"Game"> | number
    player1Id?: StringFilter<"Game"> | string
    player2Id?: StringFilter<"Game"> | string
    state?: JsonFilter<"Game">
    initialState?: JsonNullableFilter<"Game">
    currentTurn?: StringFilter<"Game"> | string
    currentRound?: IntFilter<"Game"> | number
    phase?: EnumGamePhaseFilter<"Game"> | $Enums.GamePhase
    winnerId?: StringNullableFilter<"Game"> | string | null
    createdAt?: DateTimeFilter<"Game"> | Date | string
    updatedAt?: DateTimeFilter<"Game"> | Date | string
    lobby?: XOR<LobbyScalarRelationFilter, LobbyWhereInput>
    player1?: XOR<UserScalarRelationFilter, UserWhereInput>
    player2?: XOR<UserScalarRelationFilter, UserWhereInput>
    turns?: GameTurnListRelationFilter
  }

  export type GameOrderByWithRelationInput = {
    id?: SortOrder
    lobbyId?: SortOrder
    player1Id?: SortOrder
    player2Id?: SortOrder
    state?: SortOrder
    initialState?: SortOrderInput | SortOrder
    currentTurn?: SortOrder
    currentRound?: SortOrder
    phase?: SortOrder
    winnerId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    lobby?: LobbyOrderByWithRelationInput
    player1?: UserOrderByWithRelationInput
    player2?: UserOrderByWithRelationInput
    turns?: GameTurnOrderByRelationAggregateInput
  }

  export type GameWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    lobbyId?: number
    AND?: GameWhereInput | GameWhereInput[]
    OR?: GameWhereInput[]
    NOT?: GameWhereInput | GameWhereInput[]
    player1Id?: StringFilter<"Game"> | string
    player2Id?: StringFilter<"Game"> | string
    state?: JsonFilter<"Game">
    initialState?: JsonNullableFilter<"Game">
    currentTurn?: StringFilter<"Game"> | string
    currentRound?: IntFilter<"Game"> | number
    phase?: EnumGamePhaseFilter<"Game"> | $Enums.GamePhase
    winnerId?: StringNullableFilter<"Game"> | string | null
    createdAt?: DateTimeFilter<"Game"> | Date | string
    updatedAt?: DateTimeFilter<"Game"> | Date | string
    lobby?: XOR<LobbyScalarRelationFilter, LobbyWhereInput>
    player1?: XOR<UserScalarRelationFilter, UserWhereInput>
    player2?: XOR<UserScalarRelationFilter, UserWhereInput>
    turns?: GameTurnListRelationFilter
  }, "id" | "lobbyId">

  export type GameOrderByWithAggregationInput = {
    id?: SortOrder
    lobbyId?: SortOrder
    player1Id?: SortOrder
    player2Id?: SortOrder
    state?: SortOrder
    initialState?: SortOrderInput | SortOrder
    currentTurn?: SortOrder
    currentRound?: SortOrder
    phase?: SortOrder
    winnerId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: GameCountOrderByAggregateInput
    _avg?: GameAvgOrderByAggregateInput
    _max?: GameMaxOrderByAggregateInput
    _min?: GameMinOrderByAggregateInput
    _sum?: GameSumOrderByAggregateInput
  }

  export type GameScalarWhereWithAggregatesInput = {
    AND?: GameScalarWhereWithAggregatesInput | GameScalarWhereWithAggregatesInput[]
    OR?: GameScalarWhereWithAggregatesInput[]
    NOT?: GameScalarWhereWithAggregatesInput | GameScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Game"> | number
    lobbyId?: IntWithAggregatesFilter<"Game"> | number
    player1Id?: StringWithAggregatesFilter<"Game"> | string
    player2Id?: StringWithAggregatesFilter<"Game"> | string
    state?: JsonWithAggregatesFilter<"Game">
    initialState?: JsonNullableWithAggregatesFilter<"Game">
    currentTurn?: StringWithAggregatesFilter<"Game"> | string
    currentRound?: IntWithAggregatesFilter<"Game"> | number
    phase?: EnumGamePhaseWithAggregatesFilter<"Game"> | $Enums.GamePhase
    winnerId?: StringNullableWithAggregatesFilter<"Game"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Game"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Game"> | Date | string
  }

  export type GameTurnWhereInput = {
    AND?: GameTurnWhereInput | GameTurnWhereInput[]
    OR?: GameTurnWhereInput[]
    NOT?: GameTurnWhereInput | GameTurnWhereInput[]
    id?: IntFilter<"GameTurn"> | number
    gameId?: IntFilter<"GameTurn"> | number
    playerId?: StringFilter<"GameTurn"> | string
    round?: IntFilter<"GameTurn"> | number
    actions?: JsonFilter<"GameTurn">
    snapshot?: JsonNullableFilter<"GameTurn">
    submittedAt?: DateTimeFilter<"GameTurn"> | Date | string
    game?: XOR<GameScalarRelationFilter, GameWhereInput>
  }

  export type GameTurnOrderByWithRelationInput = {
    id?: SortOrder
    gameId?: SortOrder
    playerId?: SortOrder
    round?: SortOrder
    actions?: SortOrder
    snapshot?: SortOrderInput | SortOrder
    submittedAt?: SortOrder
    game?: GameOrderByWithRelationInput
  }

  export type GameTurnWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: GameTurnWhereInput | GameTurnWhereInput[]
    OR?: GameTurnWhereInput[]
    NOT?: GameTurnWhereInput | GameTurnWhereInput[]
    gameId?: IntFilter<"GameTurn"> | number
    playerId?: StringFilter<"GameTurn"> | string
    round?: IntFilter<"GameTurn"> | number
    actions?: JsonFilter<"GameTurn">
    snapshot?: JsonNullableFilter<"GameTurn">
    submittedAt?: DateTimeFilter<"GameTurn"> | Date | string
    game?: XOR<GameScalarRelationFilter, GameWhereInput>
  }, "id">

  export type GameTurnOrderByWithAggregationInput = {
    id?: SortOrder
    gameId?: SortOrder
    playerId?: SortOrder
    round?: SortOrder
    actions?: SortOrder
    snapshot?: SortOrderInput | SortOrder
    submittedAt?: SortOrder
    _count?: GameTurnCountOrderByAggregateInput
    _avg?: GameTurnAvgOrderByAggregateInput
    _max?: GameTurnMaxOrderByAggregateInput
    _min?: GameTurnMinOrderByAggregateInput
    _sum?: GameTurnSumOrderByAggregateInput
  }

  export type GameTurnScalarWhereWithAggregatesInput = {
    AND?: GameTurnScalarWhereWithAggregatesInput | GameTurnScalarWhereWithAggregatesInput[]
    OR?: GameTurnScalarWhereWithAggregatesInput[]
    NOT?: GameTurnScalarWhereWithAggregatesInput | GameTurnScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"GameTurn"> | number
    gameId?: IntWithAggregatesFilter<"GameTurn"> | number
    playerId?: StringWithAggregatesFilter<"GameTurn"> | string
    round?: IntWithAggregatesFilter<"GameTurn"> | number
    actions?: JsonWithAggregatesFilter<"GameTurn">
    snapshot?: JsonNullableWithAggregatesFilter<"GameTurn">
    submittedAt?: DateTimeWithAggregatesFilter<"GameTurn"> | Date | string
  }

  export type MapWhereInput = {
    AND?: MapWhereInput | MapWhereInput[]
    OR?: MapWhereInput[]
    NOT?: MapWhereInput | MapWhereInput[]
    id?: IntFilter<"Map"> | number
    name?: StringFilter<"Map"> | string
    gridWidth?: IntFilter<"Map"> | number
    gridHeight?: IntFilter<"Map"> | number
    blockedTiles?: JsonFilter<"Map">
    scoringTiles?: JsonFilter<"Map">
    createdAt?: DateTimeFilter<"Map"> | Date | string
    lobbies?: LobbyListRelationFilter
  }

  export type MapOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    gridWidth?: SortOrder
    gridHeight?: SortOrder
    blockedTiles?: SortOrder
    scoringTiles?: SortOrder
    createdAt?: SortOrder
    lobbies?: LobbyOrderByRelationAggregateInput
  }

  export type MapWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: MapWhereInput | MapWhereInput[]
    OR?: MapWhereInput[]
    NOT?: MapWhereInput | MapWhereInput[]
    name?: StringFilter<"Map"> | string
    gridWidth?: IntFilter<"Map"> | number
    gridHeight?: IntFilter<"Map"> | number
    blockedTiles?: JsonFilter<"Map">
    scoringTiles?: JsonFilter<"Map">
    createdAt?: DateTimeFilter<"Map"> | Date | string
    lobbies?: LobbyListRelationFilter
  }, "id">

  export type MapOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    gridWidth?: SortOrder
    gridHeight?: SortOrder
    blockedTiles?: SortOrder
    scoringTiles?: SortOrder
    createdAt?: SortOrder
    _count?: MapCountOrderByAggregateInput
    _avg?: MapAvgOrderByAggregateInput
    _max?: MapMaxOrderByAggregateInput
    _min?: MapMinOrderByAggregateInput
    _sum?: MapSumOrderByAggregateInput
  }

  export type MapScalarWhereWithAggregatesInput = {
    AND?: MapScalarWhereWithAggregatesInput | MapScalarWhereWithAggregatesInput[]
    OR?: MapScalarWhereWithAggregatesInput[]
    NOT?: MapScalarWhereWithAggregatesInput | MapScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Map"> | number
    name?: StringWithAggregatesFilter<"Map"> | string
    gridWidth?: IntWithAggregatesFilter<"Map"> | number
    gridHeight?: IntWithAggregatesFilter<"Map"> | number
    blockedTiles?: JsonWithAggregatesFilter<"Map">
    scoringTiles?: JsonWithAggregatesFilter<"Map">
    createdAt?: DateTimeWithAggregatesFilter<"Map"> | Date | string
  }

  export type ConfigWhereInput = {
    AND?: ConfigWhereInput | ConfigWhereInput[]
    OR?: ConfigWhereInput[]
    NOT?: ConfigWhereInput | ConfigWhereInput[]
    key?: StringFilter<"Config"> | string
    value?: JsonFilter<"Config">
    updatedAt?: DateTimeFilter<"Config"> | Date | string
  }

  export type ConfigOrderByWithRelationInput = {
    key?: SortOrder
    value?: SortOrder
    updatedAt?: SortOrder
  }

  export type ConfigWhereUniqueInput = Prisma.AtLeast<{
    key?: string
    AND?: ConfigWhereInput | ConfigWhereInput[]
    OR?: ConfigWhereInput[]
    NOT?: ConfigWhereInput | ConfigWhereInput[]
    value?: JsonFilter<"Config">
    updatedAt?: DateTimeFilter<"Config"> | Date | string
  }, "key">

  export type ConfigOrderByWithAggregationInput = {
    key?: SortOrder
    value?: SortOrder
    updatedAt?: SortOrder
    _count?: ConfigCountOrderByAggregateInput
    _max?: ConfigMaxOrderByAggregateInput
    _min?: ConfigMinOrderByAggregateInput
  }

  export type ConfigScalarWhereWithAggregatesInput = {
    AND?: ConfigScalarWhereWithAggregatesInput | ConfigScalarWhereWithAggregatesInput[]
    OR?: ConfigScalarWhereWithAggregatesInput[]
    NOT?: ConfigScalarWhereWithAggregatesInput | ConfigScalarWhereWithAggregatesInput[]
    key?: StringWithAggregatesFilter<"Config"> | string
    value?: JsonWithAggregatesFilter<"Config">
    updatedAt?: DateTimeWithAggregatesFilter<"Config"> | Date | string
  }

  export type PlayerStatsWhereInput = {
    AND?: PlayerStatsWhereInput | PlayerStatsWhereInput[]
    OR?: PlayerStatsWhereInput[]
    NOT?: PlayerStatsWhereInput | PlayerStatsWhereInput[]
    userId?: StringFilter<"PlayerStats"> | string
    wins?: IntFilter<"PlayerStats"> | number
    losses?: IntFilter<"PlayerStats"> | number
    draws?: IntFilter<"PlayerStats"> | number
    totalGames?: IntFilter<"PlayerStats"> | number
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type PlayerStatsOrderByWithRelationInput = {
    userId?: SortOrder
    wins?: SortOrder
    losses?: SortOrder
    draws?: SortOrder
    totalGames?: SortOrder
    user?: UserOrderByWithRelationInput
  }

  export type PlayerStatsWhereUniqueInput = Prisma.AtLeast<{
    userId?: string
    AND?: PlayerStatsWhereInput | PlayerStatsWhereInput[]
    OR?: PlayerStatsWhereInput[]
    NOT?: PlayerStatsWhereInput | PlayerStatsWhereInput[]
    wins?: IntFilter<"PlayerStats"> | number
    losses?: IntFilter<"PlayerStats"> | number
    draws?: IntFilter<"PlayerStats"> | number
    totalGames?: IntFilter<"PlayerStats"> | number
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "userId">

  export type PlayerStatsOrderByWithAggregationInput = {
    userId?: SortOrder
    wins?: SortOrder
    losses?: SortOrder
    draws?: SortOrder
    totalGames?: SortOrder
    _count?: PlayerStatsCountOrderByAggregateInput
    _avg?: PlayerStatsAvgOrderByAggregateInput
    _max?: PlayerStatsMaxOrderByAggregateInput
    _min?: PlayerStatsMinOrderByAggregateInput
    _sum?: PlayerStatsSumOrderByAggregateInput
  }

  export type PlayerStatsScalarWhereWithAggregatesInput = {
    AND?: PlayerStatsScalarWhereWithAggregatesInput | PlayerStatsScalarWhereWithAggregatesInput[]
    OR?: PlayerStatsScalarWhereWithAggregatesInput[]
    NOT?: PlayerStatsScalarWhereWithAggregatesInput | PlayerStatsScalarWhereWithAggregatesInput[]
    userId?: StringWithAggregatesFilter<"PlayerStats"> | string
    wins?: IntWithAggregatesFilter<"PlayerStats"> | number
    losses?: IntWithAggregatesFilter<"PlayerStats"> | number
    draws?: IntWithAggregatesFilter<"PlayerStats"> | number
    totalGames?: IntWithAggregatesFilter<"PlayerStats"> | number
  }

  export type UserCreateInput = {
    id: string
    email: string
    username?: string | null
    creditBalance?: number
    purchasedShipCount?: number
    lobbiesCreatedCount?: number
    kickCount?: number
    kickTimeoutUntil?: Date | string | null
    tutorialCompleted?: boolean
    tutorialPath?: string | null
    createdAt?: Date | string
    ships?: ShipCreateNestedManyWithoutOwnerInput
    lobbiesCreated?: LobbyCreateNestedManyWithoutCreatorInput
    lobbiesJoined?: LobbyCreateNestedManyWithoutJoinerInput
    lobbiesReserved?: LobbyCreateNestedManyWithoutReservedJoinerInput
    gamesAsPlayer1?: GameCreateNestedManyWithoutPlayer1Input
    gamesAsPlayer2?: GameCreateNestedManyWithoutPlayer2Input
    fleets?: FleetCreateNestedManyWithoutOwnerInput
    stats?: PlayerStatsCreateNestedOneWithoutUserInput
  }

  export type UserUncheckedCreateInput = {
    id: string
    email: string
    username?: string | null
    creditBalance?: number
    purchasedShipCount?: number
    lobbiesCreatedCount?: number
    kickCount?: number
    kickTimeoutUntil?: Date | string | null
    tutorialCompleted?: boolean
    tutorialPath?: string | null
    createdAt?: Date | string
    ships?: ShipUncheckedCreateNestedManyWithoutOwnerInput
    lobbiesCreated?: LobbyUncheckedCreateNestedManyWithoutCreatorInput
    lobbiesJoined?: LobbyUncheckedCreateNestedManyWithoutJoinerInput
    lobbiesReserved?: LobbyUncheckedCreateNestedManyWithoutReservedJoinerInput
    gamesAsPlayer1?: GameUncheckedCreateNestedManyWithoutPlayer1Input
    gamesAsPlayer2?: GameUncheckedCreateNestedManyWithoutPlayer2Input
    fleets?: FleetUncheckedCreateNestedManyWithoutOwnerInput
    stats?: PlayerStatsUncheckedCreateNestedOneWithoutUserInput
  }

  export type UserUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    username?: NullableStringFieldUpdateOperationsInput | string | null
    creditBalance?: IntFieldUpdateOperationsInput | number
    purchasedShipCount?: IntFieldUpdateOperationsInput | number
    lobbiesCreatedCount?: IntFieldUpdateOperationsInput | number
    kickCount?: IntFieldUpdateOperationsInput | number
    kickTimeoutUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tutorialCompleted?: BoolFieldUpdateOperationsInput | boolean
    tutorialPath?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ships?: ShipUpdateManyWithoutOwnerNestedInput
    lobbiesCreated?: LobbyUpdateManyWithoutCreatorNestedInput
    lobbiesJoined?: LobbyUpdateManyWithoutJoinerNestedInput
    lobbiesReserved?: LobbyUpdateManyWithoutReservedJoinerNestedInput
    gamesAsPlayer1?: GameUpdateManyWithoutPlayer1NestedInput
    gamesAsPlayer2?: GameUpdateManyWithoutPlayer2NestedInput
    fleets?: FleetUpdateManyWithoutOwnerNestedInput
    stats?: PlayerStatsUpdateOneWithoutUserNestedInput
  }

  export type UserUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    username?: NullableStringFieldUpdateOperationsInput | string | null
    creditBalance?: IntFieldUpdateOperationsInput | number
    purchasedShipCount?: IntFieldUpdateOperationsInput | number
    lobbiesCreatedCount?: IntFieldUpdateOperationsInput | number
    kickCount?: IntFieldUpdateOperationsInput | number
    kickTimeoutUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tutorialCompleted?: BoolFieldUpdateOperationsInput | boolean
    tutorialPath?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ships?: ShipUncheckedUpdateManyWithoutOwnerNestedInput
    lobbiesCreated?: LobbyUncheckedUpdateManyWithoutCreatorNestedInput
    lobbiesJoined?: LobbyUncheckedUpdateManyWithoutJoinerNestedInput
    lobbiesReserved?: LobbyUncheckedUpdateManyWithoutReservedJoinerNestedInput
    gamesAsPlayer1?: GameUncheckedUpdateManyWithoutPlayer1NestedInput
    gamesAsPlayer2?: GameUncheckedUpdateManyWithoutPlayer2NestedInput
    fleets?: FleetUncheckedUpdateManyWithoutOwnerNestedInput
    stats?: PlayerStatsUncheckedUpdateOneWithoutUserNestedInput
  }

  export type UserCreateManyInput = {
    id: string
    email: string
    username?: string | null
    creditBalance?: number
    purchasedShipCount?: number
    lobbiesCreatedCount?: number
    kickCount?: number
    kickTimeoutUntil?: Date | string | null
    tutorialCompleted?: boolean
    tutorialPath?: string | null
    createdAt?: Date | string
  }

  export type UserUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    username?: NullableStringFieldUpdateOperationsInput | string | null
    creditBalance?: IntFieldUpdateOperationsInput | number
    purchasedShipCount?: IntFieldUpdateOperationsInput | number
    lobbiesCreatedCount?: IntFieldUpdateOperationsInput | number
    kickCount?: IntFieldUpdateOperationsInput | number
    kickTimeoutUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tutorialCompleted?: BoolFieldUpdateOperationsInput | boolean
    tutorialPath?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    username?: NullableStringFieldUpdateOperationsInput | string | null
    creditBalance?: IntFieldUpdateOperationsInput | number
    purchasedShipCount?: IntFieldUpdateOperationsInput | number
    lobbiesCreatedCount?: IntFieldUpdateOperationsInput | number
    kickCount?: IntFieldUpdateOperationsInput | number
    kickTimeoutUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tutorialCompleted?: BoolFieldUpdateOperationsInput | boolean
    tutorialPath?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ShipCreateInput = {
    name?: string
    equipment: JsonNullValueInput | InputJsonValue
    traits: JsonNullValueInput | InputJsonValue
    cost?: number
    costsVersion?: number
    isFree?: boolean
    modifiedCount?: number
    shiny?: boolean
    constructed?: boolean
    inFleet?: boolean
    destroyed?: boolean
    shipsDestroyed?: number
    destroyedAt?: Date | string | null
    createdAt?: Date | string
    owner: UserCreateNestedOneWithoutShipsInput
  }

  export type ShipUncheckedCreateInput = {
    id?: number
    ownerId: string
    name?: string
    equipment: JsonNullValueInput | InputJsonValue
    traits: JsonNullValueInput | InputJsonValue
    cost?: number
    costsVersion?: number
    isFree?: boolean
    modifiedCount?: number
    shiny?: boolean
    constructed?: boolean
    inFleet?: boolean
    destroyed?: boolean
    shipsDestroyed?: number
    destroyedAt?: Date | string | null
    createdAt?: Date | string
  }

  export type ShipUpdateInput = {
    name?: StringFieldUpdateOperationsInput | string
    equipment?: JsonNullValueInput | InputJsonValue
    traits?: JsonNullValueInput | InputJsonValue
    cost?: IntFieldUpdateOperationsInput | number
    costsVersion?: IntFieldUpdateOperationsInput | number
    isFree?: BoolFieldUpdateOperationsInput | boolean
    modifiedCount?: IntFieldUpdateOperationsInput | number
    shiny?: BoolFieldUpdateOperationsInput | boolean
    constructed?: BoolFieldUpdateOperationsInput | boolean
    inFleet?: BoolFieldUpdateOperationsInput | boolean
    destroyed?: BoolFieldUpdateOperationsInput | boolean
    shipsDestroyed?: IntFieldUpdateOperationsInput | number
    destroyedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    owner?: UserUpdateOneRequiredWithoutShipsNestedInput
  }

  export type ShipUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    ownerId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    equipment?: JsonNullValueInput | InputJsonValue
    traits?: JsonNullValueInput | InputJsonValue
    cost?: IntFieldUpdateOperationsInput | number
    costsVersion?: IntFieldUpdateOperationsInput | number
    isFree?: BoolFieldUpdateOperationsInput | boolean
    modifiedCount?: IntFieldUpdateOperationsInput | number
    shiny?: BoolFieldUpdateOperationsInput | boolean
    constructed?: BoolFieldUpdateOperationsInput | boolean
    inFleet?: BoolFieldUpdateOperationsInput | boolean
    destroyed?: BoolFieldUpdateOperationsInput | boolean
    shipsDestroyed?: IntFieldUpdateOperationsInput | number
    destroyedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ShipCreateManyInput = {
    id?: number
    ownerId: string
    name?: string
    equipment: JsonNullValueInput | InputJsonValue
    traits: JsonNullValueInput | InputJsonValue
    cost?: number
    costsVersion?: number
    isFree?: boolean
    modifiedCount?: number
    shiny?: boolean
    constructed?: boolean
    inFleet?: boolean
    destroyed?: boolean
    shipsDestroyed?: number
    destroyedAt?: Date | string | null
    createdAt?: Date | string
  }

  export type ShipUpdateManyMutationInput = {
    name?: StringFieldUpdateOperationsInput | string
    equipment?: JsonNullValueInput | InputJsonValue
    traits?: JsonNullValueInput | InputJsonValue
    cost?: IntFieldUpdateOperationsInput | number
    costsVersion?: IntFieldUpdateOperationsInput | number
    isFree?: BoolFieldUpdateOperationsInput | boolean
    modifiedCount?: IntFieldUpdateOperationsInput | number
    shiny?: BoolFieldUpdateOperationsInput | boolean
    constructed?: BoolFieldUpdateOperationsInput | boolean
    inFleet?: BoolFieldUpdateOperationsInput | boolean
    destroyed?: BoolFieldUpdateOperationsInput | boolean
    shipsDestroyed?: IntFieldUpdateOperationsInput | number
    destroyedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ShipUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    ownerId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    equipment?: JsonNullValueInput | InputJsonValue
    traits?: JsonNullValueInput | InputJsonValue
    cost?: IntFieldUpdateOperationsInput | number
    costsVersion?: IntFieldUpdateOperationsInput | number
    isFree?: BoolFieldUpdateOperationsInput | boolean
    modifiedCount?: IntFieldUpdateOperationsInput | number
    shiny?: BoolFieldUpdateOperationsInput | boolean
    constructed?: BoolFieldUpdateOperationsInput | boolean
    inFleet?: BoolFieldUpdateOperationsInput | boolean
    destroyed?: BoolFieldUpdateOperationsInput | boolean
    shipsDestroyed?: IntFieldUpdateOperationsInput | number
    destroyedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FleetCreateInput = {
    shipIds?: FleetCreateshipIdsInput | number[]
    totalCost?: number
    isComplete?: boolean
    startingPositions?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    owner: UserCreateNestedOneWithoutFleetsInput
    lobby: LobbyCreateNestedOneWithoutFleetsInput
  }

  export type FleetUncheckedCreateInput = {
    id?: number
    ownerId: string
    lobbyId: number
    shipIds?: FleetCreateshipIdsInput | number[]
    totalCost?: number
    isComplete?: boolean
    startingPositions?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type FleetUpdateInput = {
    shipIds?: FleetUpdateshipIdsInput | number[]
    totalCost?: IntFieldUpdateOperationsInput | number
    isComplete?: BoolFieldUpdateOperationsInput | boolean
    startingPositions?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    owner?: UserUpdateOneRequiredWithoutFleetsNestedInput
    lobby?: LobbyUpdateOneRequiredWithoutFleetsNestedInput
  }

  export type FleetUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    ownerId?: StringFieldUpdateOperationsInput | string
    lobbyId?: IntFieldUpdateOperationsInput | number
    shipIds?: FleetUpdateshipIdsInput | number[]
    totalCost?: IntFieldUpdateOperationsInput | number
    isComplete?: BoolFieldUpdateOperationsInput | boolean
    startingPositions?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FleetCreateManyInput = {
    id?: number
    ownerId: string
    lobbyId: number
    shipIds?: FleetCreateshipIdsInput | number[]
    totalCost?: number
    isComplete?: boolean
    startingPositions?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type FleetUpdateManyMutationInput = {
    shipIds?: FleetUpdateshipIdsInput | number[]
    totalCost?: IntFieldUpdateOperationsInput | number
    isComplete?: BoolFieldUpdateOperationsInput | boolean
    startingPositions?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FleetUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    ownerId?: StringFieldUpdateOperationsInput | string
    lobbyId?: IntFieldUpdateOperationsInput | number
    shipIds?: FleetUpdateshipIdsInput | number[]
    totalCost?: IntFieldUpdateOperationsInput | number
    isComplete?: BoolFieldUpdateOperationsInput | boolean
    startingPositions?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LobbyCreateInput = {
    status?: $Enums.LobbyStatus
    costLimit?: number
    turnTimeSeconds?: number
    maxScore?: number
    creatorGoesFirst?: boolean | null
    isAiGame?: boolean
    aiDifficulty?: string | null
    createdAt?: Date | string
    joinedAt?: Date | string | null
    joinerFleetSetAt?: Date | string | null
    creator: UserCreateNestedOneWithoutLobbiesCreatedInput
    joiner?: UserCreateNestedOneWithoutLobbiesJoinedInput
    reservedJoiner?: UserCreateNestedOneWithoutLobbiesReservedInput
    map?: MapCreateNestedOneWithoutLobbiesInput
    fleets?: FleetCreateNestedManyWithoutLobbyInput
    game?: GameCreateNestedOneWithoutLobbyInput
  }

  export type LobbyUncheckedCreateInput = {
    id?: number
    creatorId: string
    joinerId?: string | null
    reservedJoinerId?: string | null
    mapId?: number | null
    status?: $Enums.LobbyStatus
    costLimit?: number
    turnTimeSeconds?: number
    maxScore?: number
    creatorGoesFirst?: boolean | null
    isAiGame?: boolean
    aiDifficulty?: string | null
    createdAt?: Date | string
    joinedAt?: Date | string | null
    joinerFleetSetAt?: Date | string | null
    fleets?: FleetUncheckedCreateNestedManyWithoutLobbyInput
    game?: GameUncheckedCreateNestedOneWithoutLobbyInput
  }

  export type LobbyUpdateInput = {
    status?: EnumLobbyStatusFieldUpdateOperationsInput | $Enums.LobbyStatus
    costLimit?: IntFieldUpdateOperationsInput | number
    turnTimeSeconds?: IntFieldUpdateOperationsInput | number
    maxScore?: IntFieldUpdateOperationsInput | number
    creatorGoesFirst?: NullableBoolFieldUpdateOperationsInput | boolean | null
    isAiGame?: BoolFieldUpdateOperationsInput | boolean
    aiDifficulty?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    joinedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    joinerFleetSetAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creator?: UserUpdateOneRequiredWithoutLobbiesCreatedNestedInput
    joiner?: UserUpdateOneWithoutLobbiesJoinedNestedInput
    reservedJoiner?: UserUpdateOneWithoutLobbiesReservedNestedInput
    map?: MapUpdateOneWithoutLobbiesNestedInput
    fleets?: FleetUpdateManyWithoutLobbyNestedInput
    game?: GameUpdateOneWithoutLobbyNestedInput
  }

  export type LobbyUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    creatorId?: StringFieldUpdateOperationsInput | string
    joinerId?: NullableStringFieldUpdateOperationsInput | string | null
    reservedJoinerId?: NullableStringFieldUpdateOperationsInput | string | null
    mapId?: NullableIntFieldUpdateOperationsInput | number | null
    status?: EnumLobbyStatusFieldUpdateOperationsInput | $Enums.LobbyStatus
    costLimit?: IntFieldUpdateOperationsInput | number
    turnTimeSeconds?: IntFieldUpdateOperationsInput | number
    maxScore?: IntFieldUpdateOperationsInput | number
    creatorGoesFirst?: NullableBoolFieldUpdateOperationsInput | boolean | null
    isAiGame?: BoolFieldUpdateOperationsInput | boolean
    aiDifficulty?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    joinedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    joinerFleetSetAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fleets?: FleetUncheckedUpdateManyWithoutLobbyNestedInput
    game?: GameUncheckedUpdateOneWithoutLobbyNestedInput
  }

  export type LobbyCreateManyInput = {
    id?: number
    creatorId: string
    joinerId?: string | null
    reservedJoinerId?: string | null
    mapId?: number | null
    status?: $Enums.LobbyStatus
    costLimit?: number
    turnTimeSeconds?: number
    maxScore?: number
    creatorGoesFirst?: boolean | null
    isAiGame?: boolean
    aiDifficulty?: string | null
    createdAt?: Date | string
    joinedAt?: Date | string | null
    joinerFleetSetAt?: Date | string | null
  }

  export type LobbyUpdateManyMutationInput = {
    status?: EnumLobbyStatusFieldUpdateOperationsInput | $Enums.LobbyStatus
    costLimit?: IntFieldUpdateOperationsInput | number
    turnTimeSeconds?: IntFieldUpdateOperationsInput | number
    maxScore?: IntFieldUpdateOperationsInput | number
    creatorGoesFirst?: NullableBoolFieldUpdateOperationsInput | boolean | null
    isAiGame?: BoolFieldUpdateOperationsInput | boolean
    aiDifficulty?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    joinedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    joinerFleetSetAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type LobbyUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    creatorId?: StringFieldUpdateOperationsInput | string
    joinerId?: NullableStringFieldUpdateOperationsInput | string | null
    reservedJoinerId?: NullableStringFieldUpdateOperationsInput | string | null
    mapId?: NullableIntFieldUpdateOperationsInput | number | null
    status?: EnumLobbyStatusFieldUpdateOperationsInput | $Enums.LobbyStatus
    costLimit?: IntFieldUpdateOperationsInput | number
    turnTimeSeconds?: IntFieldUpdateOperationsInput | number
    maxScore?: IntFieldUpdateOperationsInput | number
    creatorGoesFirst?: NullableBoolFieldUpdateOperationsInput | boolean | null
    isAiGame?: BoolFieldUpdateOperationsInput | boolean
    aiDifficulty?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    joinedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    joinerFleetSetAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type GameCreateInput = {
    state: JsonNullValueInput | InputJsonValue
    initialState?: NullableJsonNullValueInput | InputJsonValue
    currentTurn: string
    currentRound?: number
    phase?: $Enums.GamePhase
    winnerId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    lobby: LobbyCreateNestedOneWithoutGameInput
    player1: UserCreateNestedOneWithoutGamesAsPlayer1Input
    player2: UserCreateNestedOneWithoutGamesAsPlayer2Input
    turns?: GameTurnCreateNestedManyWithoutGameInput
  }

  export type GameUncheckedCreateInput = {
    id?: number
    lobbyId: number
    player1Id: string
    player2Id: string
    state: JsonNullValueInput | InputJsonValue
    initialState?: NullableJsonNullValueInput | InputJsonValue
    currentTurn: string
    currentRound?: number
    phase?: $Enums.GamePhase
    winnerId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    turns?: GameTurnUncheckedCreateNestedManyWithoutGameInput
  }

  export type GameUpdateInput = {
    state?: JsonNullValueInput | InputJsonValue
    initialState?: NullableJsonNullValueInput | InputJsonValue
    currentTurn?: StringFieldUpdateOperationsInput | string
    currentRound?: IntFieldUpdateOperationsInput | number
    phase?: EnumGamePhaseFieldUpdateOperationsInput | $Enums.GamePhase
    winnerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lobby?: LobbyUpdateOneRequiredWithoutGameNestedInput
    player1?: UserUpdateOneRequiredWithoutGamesAsPlayer1NestedInput
    player2?: UserUpdateOneRequiredWithoutGamesAsPlayer2NestedInput
    turns?: GameTurnUpdateManyWithoutGameNestedInput
  }

  export type GameUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    lobbyId?: IntFieldUpdateOperationsInput | number
    player1Id?: StringFieldUpdateOperationsInput | string
    player2Id?: StringFieldUpdateOperationsInput | string
    state?: JsonNullValueInput | InputJsonValue
    initialState?: NullableJsonNullValueInput | InputJsonValue
    currentTurn?: StringFieldUpdateOperationsInput | string
    currentRound?: IntFieldUpdateOperationsInput | number
    phase?: EnumGamePhaseFieldUpdateOperationsInput | $Enums.GamePhase
    winnerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    turns?: GameTurnUncheckedUpdateManyWithoutGameNestedInput
  }

  export type GameCreateManyInput = {
    id?: number
    lobbyId: number
    player1Id: string
    player2Id: string
    state: JsonNullValueInput | InputJsonValue
    initialState?: NullableJsonNullValueInput | InputJsonValue
    currentTurn: string
    currentRound?: number
    phase?: $Enums.GamePhase
    winnerId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type GameUpdateManyMutationInput = {
    state?: JsonNullValueInput | InputJsonValue
    initialState?: NullableJsonNullValueInput | InputJsonValue
    currentTurn?: StringFieldUpdateOperationsInput | string
    currentRound?: IntFieldUpdateOperationsInput | number
    phase?: EnumGamePhaseFieldUpdateOperationsInput | $Enums.GamePhase
    winnerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GameUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    lobbyId?: IntFieldUpdateOperationsInput | number
    player1Id?: StringFieldUpdateOperationsInput | string
    player2Id?: StringFieldUpdateOperationsInput | string
    state?: JsonNullValueInput | InputJsonValue
    initialState?: NullableJsonNullValueInput | InputJsonValue
    currentTurn?: StringFieldUpdateOperationsInput | string
    currentRound?: IntFieldUpdateOperationsInput | number
    phase?: EnumGamePhaseFieldUpdateOperationsInput | $Enums.GamePhase
    winnerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GameTurnCreateInput = {
    playerId: string
    round: number
    actions: JsonNullValueInput | InputJsonValue
    snapshot?: NullableJsonNullValueInput | InputJsonValue
    submittedAt?: Date | string
    game: GameCreateNestedOneWithoutTurnsInput
  }

  export type GameTurnUncheckedCreateInput = {
    id?: number
    gameId: number
    playerId: string
    round: number
    actions: JsonNullValueInput | InputJsonValue
    snapshot?: NullableJsonNullValueInput | InputJsonValue
    submittedAt?: Date | string
  }

  export type GameTurnUpdateInput = {
    playerId?: StringFieldUpdateOperationsInput | string
    round?: IntFieldUpdateOperationsInput | number
    actions?: JsonNullValueInput | InputJsonValue
    snapshot?: NullableJsonNullValueInput | InputJsonValue
    submittedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    game?: GameUpdateOneRequiredWithoutTurnsNestedInput
  }

  export type GameTurnUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    gameId?: IntFieldUpdateOperationsInput | number
    playerId?: StringFieldUpdateOperationsInput | string
    round?: IntFieldUpdateOperationsInput | number
    actions?: JsonNullValueInput | InputJsonValue
    snapshot?: NullableJsonNullValueInput | InputJsonValue
    submittedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GameTurnCreateManyInput = {
    id?: number
    gameId: number
    playerId: string
    round: number
    actions: JsonNullValueInput | InputJsonValue
    snapshot?: NullableJsonNullValueInput | InputJsonValue
    submittedAt?: Date | string
  }

  export type GameTurnUpdateManyMutationInput = {
    playerId?: StringFieldUpdateOperationsInput | string
    round?: IntFieldUpdateOperationsInput | number
    actions?: JsonNullValueInput | InputJsonValue
    snapshot?: NullableJsonNullValueInput | InputJsonValue
    submittedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GameTurnUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    gameId?: IntFieldUpdateOperationsInput | number
    playerId?: StringFieldUpdateOperationsInput | string
    round?: IntFieldUpdateOperationsInput | number
    actions?: JsonNullValueInput | InputJsonValue
    snapshot?: NullableJsonNullValueInput | InputJsonValue
    submittedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MapCreateInput = {
    name: string
    gridWidth?: number
    gridHeight?: number
    blockedTiles?: JsonNullValueInput | InputJsonValue
    scoringTiles?: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    lobbies?: LobbyCreateNestedManyWithoutMapInput
  }

  export type MapUncheckedCreateInput = {
    id?: number
    name: string
    gridWidth?: number
    gridHeight?: number
    blockedTiles?: JsonNullValueInput | InputJsonValue
    scoringTiles?: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    lobbies?: LobbyUncheckedCreateNestedManyWithoutMapInput
  }

  export type MapUpdateInput = {
    name?: StringFieldUpdateOperationsInput | string
    gridWidth?: IntFieldUpdateOperationsInput | number
    gridHeight?: IntFieldUpdateOperationsInput | number
    blockedTiles?: JsonNullValueInput | InputJsonValue
    scoringTiles?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lobbies?: LobbyUpdateManyWithoutMapNestedInput
  }

  export type MapUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    gridWidth?: IntFieldUpdateOperationsInput | number
    gridHeight?: IntFieldUpdateOperationsInput | number
    blockedTiles?: JsonNullValueInput | InputJsonValue
    scoringTiles?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lobbies?: LobbyUncheckedUpdateManyWithoutMapNestedInput
  }

  export type MapCreateManyInput = {
    id?: number
    name: string
    gridWidth?: number
    gridHeight?: number
    blockedTiles?: JsonNullValueInput | InputJsonValue
    scoringTiles?: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type MapUpdateManyMutationInput = {
    name?: StringFieldUpdateOperationsInput | string
    gridWidth?: IntFieldUpdateOperationsInput | number
    gridHeight?: IntFieldUpdateOperationsInput | number
    blockedTiles?: JsonNullValueInput | InputJsonValue
    scoringTiles?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MapUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    gridWidth?: IntFieldUpdateOperationsInput | number
    gridHeight?: IntFieldUpdateOperationsInput | number
    blockedTiles?: JsonNullValueInput | InputJsonValue
    scoringTiles?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ConfigCreateInput = {
    key: string
    value: JsonNullValueInput | InputJsonValue
    updatedAt?: Date | string
  }

  export type ConfigUncheckedCreateInput = {
    key: string
    value: JsonNullValueInput | InputJsonValue
    updatedAt?: Date | string
  }

  export type ConfigUpdateInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: JsonNullValueInput | InputJsonValue
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ConfigUncheckedUpdateInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: JsonNullValueInput | InputJsonValue
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ConfigCreateManyInput = {
    key: string
    value: JsonNullValueInput | InputJsonValue
    updatedAt?: Date | string
  }

  export type ConfigUpdateManyMutationInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: JsonNullValueInput | InputJsonValue
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ConfigUncheckedUpdateManyInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: JsonNullValueInput | InputJsonValue
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PlayerStatsCreateInput = {
    wins?: number
    losses?: number
    draws?: number
    totalGames?: number
    user: UserCreateNestedOneWithoutStatsInput
  }

  export type PlayerStatsUncheckedCreateInput = {
    userId: string
    wins?: number
    losses?: number
    draws?: number
    totalGames?: number
  }

  export type PlayerStatsUpdateInput = {
    wins?: IntFieldUpdateOperationsInput | number
    losses?: IntFieldUpdateOperationsInput | number
    draws?: IntFieldUpdateOperationsInput | number
    totalGames?: IntFieldUpdateOperationsInput | number
    user?: UserUpdateOneRequiredWithoutStatsNestedInput
  }

  export type PlayerStatsUncheckedUpdateInput = {
    userId?: StringFieldUpdateOperationsInput | string
    wins?: IntFieldUpdateOperationsInput | number
    losses?: IntFieldUpdateOperationsInput | number
    draws?: IntFieldUpdateOperationsInput | number
    totalGames?: IntFieldUpdateOperationsInput | number
  }

  export type PlayerStatsCreateManyInput = {
    userId: string
    wins?: number
    losses?: number
    draws?: number
    totalGames?: number
  }

  export type PlayerStatsUpdateManyMutationInput = {
    wins?: IntFieldUpdateOperationsInput | number
    losses?: IntFieldUpdateOperationsInput | number
    draws?: IntFieldUpdateOperationsInput | number
    totalGames?: IntFieldUpdateOperationsInput | number
  }

  export type PlayerStatsUncheckedUpdateManyInput = {
    userId?: StringFieldUpdateOperationsInput | string
    wins?: IntFieldUpdateOperationsInput | number
    losses?: IntFieldUpdateOperationsInput | number
    draws?: IntFieldUpdateOperationsInput | number
    totalGames?: IntFieldUpdateOperationsInput | number
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type ShipListRelationFilter = {
    every?: ShipWhereInput
    some?: ShipWhereInput
    none?: ShipWhereInput
  }

  export type LobbyListRelationFilter = {
    every?: LobbyWhereInput
    some?: LobbyWhereInput
    none?: LobbyWhereInput
  }

  export type GameListRelationFilter = {
    every?: GameWhereInput
    some?: GameWhereInput
    none?: GameWhereInput
  }

  export type FleetListRelationFilter = {
    every?: FleetWhereInput
    some?: FleetWhereInput
    none?: FleetWhereInput
  }

  export type PlayerStatsNullableScalarRelationFilter = {
    is?: PlayerStatsWhereInput | null
    isNot?: PlayerStatsWhereInput | null
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type ShipOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type LobbyOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type GameOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type FleetOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    username?: SortOrder
    creditBalance?: SortOrder
    purchasedShipCount?: SortOrder
    lobbiesCreatedCount?: SortOrder
    kickCount?: SortOrder
    kickTimeoutUntil?: SortOrder
    tutorialCompleted?: SortOrder
    tutorialPath?: SortOrder
    createdAt?: SortOrder
  }

  export type UserAvgOrderByAggregateInput = {
    creditBalance?: SortOrder
    purchasedShipCount?: SortOrder
    lobbiesCreatedCount?: SortOrder
    kickCount?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    username?: SortOrder
    creditBalance?: SortOrder
    purchasedShipCount?: SortOrder
    lobbiesCreatedCount?: SortOrder
    kickCount?: SortOrder
    kickTimeoutUntil?: SortOrder
    tutorialCompleted?: SortOrder
    tutorialPath?: SortOrder
    createdAt?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    username?: SortOrder
    creditBalance?: SortOrder
    purchasedShipCount?: SortOrder
    lobbiesCreatedCount?: SortOrder
    kickCount?: SortOrder
    kickTimeoutUntil?: SortOrder
    tutorialCompleted?: SortOrder
    tutorialPath?: SortOrder
    createdAt?: SortOrder
  }

  export type UserSumOrderByAggregateInput = {
    creditBalance?: SortOrder
    purchasedShipCount?: SortOrder
    lobbiesCreatedCount?: SortOrder
    kickCount?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }
  export type JsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonFilterBase<$PrismaModel>>, 'path'>>

  export type JsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type UserScalarRelationFilter = {
    is?: UserWhereInput
    isNot?: UserWhereInput
  }

  export type ShipCountOrderByAggregateInput = {
    id?: SortOrder
    ownerId?: SortOrder
    name?: SortOrder
    equipment?: SortOrder
    traits?: SortOrder
    cost?: SortOrder
    costsVersion?: SortOrder
    isFree?: SortOrder
    modifiedCount?: SortOrder
    shiny?: SortOrder
    constructed?: SortOrder
    inFleet?: SortOrder
    destroyed?: SortOrder
    shipsDestroyed?: SortOrder
    destroyedAt?: SortOrder
    createdAt?: SortOrder
  }

  export type ShipAvgOrderByAggregateInput = {
    id?: SortOrder
    cost?: SortOrder
    costsVersion?: SortOrder
    modifiedCount?: SortOrder
    shipsDestroyed?: SortOrder
  }

  export type ShipMaxOrderByAggregateInput = {
    id?: SortOrder
    ownerId?: SortOrder
    name?: SortOrder
    cost?: SortOrder
    costsVersion?: SortOrder
    isFree?: SortOrder
    modifiedCount?: SortOrder
    shiny?: SortOrder
    constructed?: SortOrder
    inFleet?: SortOrder
    destroyed?: SortOrder
    shipsDestroyed?: SortOrder
    destroyedAt?: SortOrder
    createdAt?: SortOrder
  }

  export type ShipMinOrderByAggregateInput = {
    id?: SortOrder
    ownerId?: SortOrder
    name?: SortOrder
    cost?: SortOrder
    costsVersion?: SortOrder
    isFree?: SortOrder
    modifiedCount?: SortOrder
    shiny?: SortOrder
    constructed?: SortOrder
    inFleet?: SortOrder
    destroyed?: SortOrder
    shipsDestroyed?: SortOrder
    destroyedAt?: SortOrder
    createdAt?: SortOrder
  }

  export type ShipSumOrderByAggregateInput = {
    id?: SortOrder
    cost?: SortOrder
    costsVersion?: SortOrder
    modifiedCount?: SortOrder
    shipsDestroyed?: SortOrder
  }
  export type JsonWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedJsonFilter<$PrismaModel>
    _max?: NestedJsonFilter<$PrismaModel>
  }

  export type IntNullableListFilter<$PrismaModel = never> = {
    equals?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    has?: number | IntFieldRefInput<$PrismaModel> | null
    hasEvery?: number[] | ListIntFieldRefInput<$PrismaModel>
    hasSome?: number[] | ListIntFieldRefInput<$PrismaModel>
    isEmpty?: boolean
  }
  export type JsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type LobbyScalarRelationFilter = {
    is?: LobbyWhereInput
    isNot?: LobbyWhereInput
  }

  export type FleetCountOrderByAggregateInput = {
    id?: SortOrder
    ownerId?: SortOrder
    lobbyId?: SortOrder
    shipIds?: SortOrder
    totalCost?: SortOrder
    isComplete?: SortOrder
    startingPositions?: SortOrder
    createdAt?: SortOrder
  }

  export type FleetAvgOrderByAggregateInput = {
    id?: SortOrder
    lobbyId?: SortOrder
    shipIds?: SortOrder
    totalCost?: SortOrder
  }

  export type FleetMaxOrderByAggregateInput = {
    id?: SortOrder
    ownerId?: SortOrder
    lobbyId?: SortOrder
    totalCost?: SortOrder
    isComplete?: SortOrder
    createdAt?: SortOrder
  }

  export type FleetMinOrderByAggregateInput = {
    id?: SortOrder
    ownerId?: SortOrder
    lobbyId?: SortOrder
    totalCost?: SortOrder
    isComplete?: SortOrder
    createdAt?: SortOrder
  }

  export type FleetSumOrderByAggregateInput = {
    id?: SortOrder
    lobbyId?: SortOrder
    shipIds?: SortOrder
    totalCost?: SortOrder
  }
  export type JsonNullableWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedJsonNullableFilter<$PrismaModel>
    _max?: NestedJsonNullableFilter<$PrismaModel>
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type EnumLobbyStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.LobbyStatus | EnumLobbyStatusFieldRefInput<$PrismaModel>
    in?: $Enums.LobbyStatus[] | ListEnumLobbyStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.LobbyStatus[] | ListEnumLobbyStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumLobbyStatusFilter<$PrismaModel> | $Enums.LobbyStatus
  }

  export type BoolNullableFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableFilter<$PrismaModel> | boolean | null
  }

  export type UserNullableScalarRelationFilter = {
    is?: UserWhereInput | null
    isNot?: UserWhereInput | null
  }

  export type MapNullableScalarRelationFilter = {
    is?: MapWhereInput | null
    isNot?: MapWhereInput | null
  }

  export type GameNullableScalarRelationFilter = {
    is?: GameWhereInput | null
    isNot?: GameWhereInput | null
  }

  export type LobbyCountOrderByAggregateInput = {
    id?: SortOrder
    creatorId?: SortOrder
    joinerId?: SortOrder
    reservedJoinerId?: SortOrder
    mapId?: SortOrder
    status?: SortOrder
    costLimit?: SortOrder
    turnTimeSeconds?: SortOrder
    maxScore?: SortOrder
    creatorGoesFirst?: SortOrder
    isAiGame?: SortOrder
    aiDifficulty?: SortOrder
    createdAt?: SortOrder
    joinedAt?: SortOrder
    joinerFleetSetAt?: SortOrder
  }

  export type LobbyAvgOrderByAggregateInput = {
    id?: SortOrder
    mapId?: SortOrder
    costLimit?: SortOrder
    turnTimeSeconds?: SortOrder
    maxScore?: SortOrder
  }

  export type LobbyMaxOrderByAggregateInput = {
    id?: SortOrder
    creatorId?: SortOrder
    joinerId?: SortOrder
    reservedJoinerId?: SortOrder
    mapId?: SortOrder
    status?: SortOrder
    costLimit?: SortOrder
    turnTimeSeconds?: SortOrder
    maxScore?: SortOrder
    creatorGoesFirst?: SortOrder
    isAiGame?: SortOrder
    aiDifficulty?: SortOrder
    createdAt?: SortOrder
    joinedAt?: SortOrder
    joinerFleetSetAt?: SortOrder
  }

  export type LobbyMinOrderByAggregateInput = {
    id?: SortOrder
    creatorId?: SortOrder
    joinerId?: SortOrder
    reservedJoinerId?: SortOrder
    mapId?: SortOrder
    status?: SortOrder
    costLimit?: SortOrder
    turnTimeSeconds?: SortOrder
    maxScore?: SortOrder
    creatorGoesFirst?: SortOrder
    isAiGame?: SortOrder
    aiDifficulty?: SortOrder
    createdAt?: SortOrder
    joinedAt?: SortOrder
    joinerFleetSetAt?: SortOrder
  }

  export type LobbySumOrderByAggregateInput = {
    id?: SortOrder
    mapId?: SortOrder
    costLimit?: SortOrder
    turnTimeSeconds?: SortOrder
    maxScore?: SortOrder
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type EnumLobbyStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.LobbyStatus | EnumLobbyStatusFieldRefInput<$PrismaModel>
    in?: $Enums.LobbyStatus[] | ListEnumLobbyStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.LobbyStatus[] | ListEnumLobbyStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumLobbyStatusWithAggregatesFilter<$PrismaModel> | $Enums.LobbyStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumLobbyStatusFilter<$PrismaModel>
    _max?: NestedEnumLobbyStatusFilter<$PrismaModel>
  }

  export type BoolNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableWithAggregatesFilter<$PrismaModel> | boolean | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedBoolNullableFilter<$PrismaModel>
    _max?: NestedBoolNullableFilter<$PrismaModel>
  }

  export type EnumGamePhaseFilter<$PrismaModel = never> = {
    equals?: $Enums.GamePhase | EnumGamePhaseFieldRefInput<$PrismaModel>
    in?: $Enums.GamePhase[] | ListEnumGamePhaseFieldRefInput<$PrismaModel>
    notIn?: $Enums.GamePhase[] | ListEnumGamePhaseFieldRefInput<$PrismaModel>
    not?: NestedEnumGamePhaseFilter<$PrismaModel> | $Enums.GamePhase
  }

  export type GameTurnListRelationFilter = {
    every?: GameTurnWhereInput
    some?: GameTurnWhereInput
    none?: GameTurnWhereInput
  }

  export type GameTurnOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type GameCountOrderByAggregateInput = {
    id?: SortOrder
    lobbyId?: SortOrder
    player1Id?: SortOrder
    player2Id?: SortOrder
    state?: SortOrder
    initialState?: SortOrder
    currentTurn?: SortOrder
    currentRound?: SortOrder
    phase?: SortOrder
    winnerId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type GameAvgOrderByAggregateInput = {
    id?: SortOrder
    lobbyId?: SortOrder
    currentRound?: SortOrder
  }

  export type GameMaxOrderByAggregateInput = {
    id?: SortOrder
    lobbyId?: SortOrder
    player1Id?: SortOrder
    player2Id?: SortOrder
    currentTurn?: SortOrder
    currentRound?: SortOrder
    phase?: SortOrder
    winnerId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type GameMinOrderByAggregateInput = {
    id?: SortOrder
    lobbyId?: SortOrder
    player1Id?: SortOrder
    player2Id?: SortOrder
    currentTurn?: SortOrder
    currentRound?: SortOrder
    phase?: SortOrder
    winnerId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type GameSumOrderByAggregateInput = {
    id?: SortOrder
    lobbyId?: SortOrder
    currentRound?: SortOrder
  }

  export type EnumGamePhaseWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.GamePhase | EnumGamePhaseFieldRefInput<$PrismaModel>
    in?: $Enums.GamePhase[] | ListEnumGamePhaseFieldRefInput<$PrismaModel>
    notIn?: $Enums.GamePhase[] | ListEnumGamePhaseFieldRefInput<$PrismaModel>
    not?: NestedEnumGamePhaseWithAggregatesFilter<$PrismaModel> | $Enums.GamePhase
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumGamePhaseFilter<$PrismaModel>
    _max?: NestedEnumGamePhaseFilter<$PrismaModel>
  }

  export type GameScalarRelationFilter = {
    is?: GameWhereInput
    isNot?: GameWhereInput
  }

  export type GameTurnCountOrderByAggregateInput = {
    id?: SortOrder
    gameId?: SortOrder
    playerId?: SortOrder
    round?: SortOrder
    actions?: SortOrder
    snapshot?: SortOrder
    submittedAt?: SortOrder
  }

  export type GameTurnAvgOrderByAggregateInput = {
    id?: SortOrder
    gameId?: SortOrder
    round?: SortOrder
  }

  export type GameTurnMaxOrderByAggregateInput = {
    id?: SortOrder
    gameId?: SortOrder
    playerId?: SortOrder
    round?: SortOrder
    submittedAt?: SortOrder
  }

  export type GameTurnMinOrderByAggregateInput = {
    id?: SortOrder
    gameId?: SortOrder
    playerId?: SortOrder
    round?: SortOrder
    submittedAt?: SortOrder
  }

  export type GameTurnSumOrderByAggregateInput = {
    id?: SortOrder
    gameId?: SortOrder
    round?: SortOrder
  }

  export type MapCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    gridWidth?: SortOrder
    gridHeight?: SortOrder
    blockedTiles?: SortOrder
    scoringTiles?: SortOrder
    createdAt?: SortOrder
  }

  export type MapAvgOrderByAggregateInput = {
    id?: SortOrder
    gridWidth?: SortOrder
    gridHeight?: SortOrder
  }

  export type MapMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    gridWidth?: SortOrder
    gridHeight?: SortOrder
    createdAt?: SortOrder
  }

  export type MapMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    gridWidth?: SortOrder
    gridHeight?: SortOrder
    createdAt?: SortOrder
  }

  export type MapSumOrderByAggregateInput = {
    id?: SortOrder
    gridWidth?: SortOrder
    gridHeight?: SortOrder
  }

  export type ConfigCountOrderByAggregateInput = {
    key?: SortOrder
    value?: SortOrder
    updatedAt?: SortOrder
  }

  export type ConfigMaxOrderByAggregateInput = {
    key?: SortOrder
    updatedAt?: SortOrder
  }

  export type ConfigMinOrderByAggregateInput = {
    key?: SortOrder
    updatedAt?: SortOrder
  }

  export type PlayerStatsCountOrderByAggregateInput = {
    userId?: SortOrder
    wins?: SortOrder
    losses?: SortOrder
    draws?: SortOrder
    totalGames?: SortOrder
  }

  export type PlayerStatsAvgOrderByAggregateInput = {
    wins?: SortOrder
    losses?: SortOrder
    draws?: SortOrder
    totalGames?: SortOrder
  }

  export type PlayerStatsMaxOrderByAggregateInput = {
    userId?: SortOrder
    wins?: SortOrder
    losses?: SortOrder
    draws?: SortOrder
    totalGames?: SortOrder
  }

  export type PlayerStatsMinOrderByAggregateInput = {
    userId?: SortOrder
    wins?: SortOrder
    losses?: SortOrder
    draws?: SortOrder
    totalGames?: SortOrder
  }

  export type PlayerStatsSumOrderByAggregateInput = {
    wins?: SortOrder
    losses?: SortOrder
    draws?: SortOrder
    totalGames?: SortOrder
  }

  export type ShipCreateNestedManyWithoutOwnerInput = {
    create?: XOR<ShipCreateWithoutOwnerInput, ShipUncheckedCreateWithoutOwnerInput> | ShipCreateWithoutOwnerInput[] | ShipUncheckedCreateWithoutOwnerInput[]
    connectOrCreate?: ShipCreateOrConnectWithoutOwnerInput | ShipCreateOrConnectWithoutOwnerInput[]
    createMany?: ShipCreateManyOwnerInputEnvelope
    connect?: ShipWhereUniqueInput | ShipWhereUniqueInput[]
  }

  export type LobbyCreateNestedManyWithoutCreatorInput = {
    create?: XOR<LobbyCreateWithoutCreatorInput, LobbyUncheckedCreateWithoutCreatorInput> | LobbyCreateWithoutCreatorInput[] | LobbyUncheckedCreateWithoutCreatorInput[]
    connectOrCreate?: LobbyCreateOrConnectWithoutCreatorInput | LobbyCreateOrConnectWithoutCreatorInput[]
    createMany?: LobbyCreateManyCreatorInputEnvelope
    connect?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
  }

  export type LobbyCreateNestedManyWithoutJoinerInput = {
    create?: XOR<LobbyCreateWithoutJoinerInput, LobbyUncheckedCreateWithoutJoinerInput> | LobbyCreateWithoutJoinerInput[] | LobbyUncheckedCreateWithoutJoinerInput[]
    connectOrCreate?: LobbyCreateOrConnectWithoutJoinerInput | LobbyCreateOrConnectWithoutJoinerInput[]
    createMany?: LobbyCreateManyJoinerInputEnvelope
    connect?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
  }

  export type LobbyCreateNestedManyWithoutReservedJoinerInput = {
    create?: XOR<LobbyCreateWithoutReservedJoinerInput, LobbyUncheckedCreateWithoutReservedJoinerInput> | LobbyCreateWithoutReservedJoinerInput[] | LobbyUncheckedCreateWithoutReservedJoinerInput[]
    connectOrCreate?: LobbyCreateOrConnectWithoutReservedJoinerInput | LobbyCreateOrConnectWithoutReservedJoinerInput[]
    createMany?: LobbyCreateManyReservedJoinerInputEnvelope
    connect?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
  }

  export type GameCreateNestedManyWithoutPlayer1Input = {
    create?: XOR<GameCreateWithoutPlayer1Input, GameUncheckedCreateWithoutPlayer1Input> | GameCreateWithoutPlayer1Input[] | GameUncheckedCreateWithoutPlayer1Input[]
    connectOrCreate?: GameCreateOrConnectWithoutPlayer1Input | GameCreateOrConnectWithoutPlayer1Input[]
    createMany?: GameCreateManyPlayer1InputEnvelope
    connect?: GameWhereUniqueInput | GameWhereUniqueInput[]
  }

  export type GameCreateNestedManyWithoutPlayer2Input = {
    create?: XOR<GameCreateWithoutPlayer2Input, GameUncheckedCreateWithoutPlayer2Input> | GameCreateWithoutPlayer2Input[] | GameUncheckedCreateWithoutPlayer2Input[]
    connectOrCreate?: GameCreateOrConnectWithoutPlayer2Input | GameCreateOrConnectWithoutPlayer2Input[]
    createMany?: GameCreateManyPlayer2InputEnvelope
    connect?: GameWhereUniqueInput | GameWhereUniqueInput[]
  }

  export type FleetCreateNestedManyWithoutOwnerInput = {
    create?: XOR<FleetCreateWithoutOwnerInput, FleetUncheckedCreateWithoutOwnerInput> | FleetCreateWithoutOwnerInput[] | FleetUncheckedCreateWithoutOwnerInput[]
    connectOrCreate?: FleetCreateOrConnectWithoutOwnerInput | FleetCreateOrConnectWithoutOwnerInput[]
    createMany?: FleetCreateManyOwnerInputEnvelope
    connect?: FleetWhereUniqueInput | FleetWhereUniqueInput[]
  }

  export type PlayerStatsCreateNestedOneWithoutUserInput = {
    create?: XOR<PlayerStatsCreateWithoutUserInput, PlayerStatsUncheckedCreateWithoutUserInput>
    connectOrCreate?: PlayerStatsCreateOrConnectWithoutUserInput
    connect?: PlayerStatsWhereUniqueInput
  }

  export type ShipUncheckedCreateNestedManyWithoutOwnerInput = {
    create?: XOR<ShipCreateWithoutOwnerInput, ShipUncheckedCreateWithoutOwnerInput> | ShipCreateWithoutOwnerInput[] | ShipUncheckedCreateWithoutOwnerInput[]
    connectOrCreate?: ShipCreateOrConnectWithoutOwnerInput | ShipCreateOrConnectWithoutOwnerInput[]
    createMany?: ShipCreateManyOwnerInputEnvelope
    connect?: ShipWhereUniqueInput | ShipWhereUniqueInput[]
  }

  export type LobbyUncheckedCreateNestedManyWithoutCreatorInput = {
    create?: XOR<LobbyCreateWithoutCreatorInput, LobbyUncheckedCreateWithoutCreatorInput> | LobbyCreateWithoutCreatorInput[] | LobbyUncheckedCreateWithoutCreatorInput[]
    connectOrCreate?: LobbyCreateOrConnectWithoutCreatorInput | LobbyCreateOrConnectWithoutCreatorInput[]
    createMany?: LobbyCreateManyCreatorInputEnvelope
    connect?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
  }

  export type LobbyUncheckedCreateNestedManyWithoutJoinerInput = {
    create?: XOR<LobbyCreateWithoutJoinerInput, LobbyUncheckedCreateWithoutJoinerInput> | LobbyCreateWithoutJoinerInput[] | LobbyUncheckedCreateWithoutJoinerInput[]
    connectOrCreate?: LobbyCreateOrConnectWithoutJoinerInput | LobbyCreateOrConnectWithoutJoinerInput[]
    createMany?: LobbyCreateManyJoinerInputEnvelope
    connect?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
  }

  export type LobbyUncheckedCreateNestedManyWithoutReservedJoinerInput = {
    create?: XOR<LobbyCreateWithoutReservedJoinerInput, LobbyUncheckedCreateWithoutReservedJoinerInput> | LobbyCreateWithoutReservedJoinerInput[] | LobbyUncheckedCreateWithoutReservedJoinerInput[]
    connectOrCreate?: LobbyCreateOrConnectWithoutReservedJoinerInput | LobbyCreateOrConnectWithoutReservedJoinerInput[]
    createMany?: LobbyCreateManyReservedJoinerInputEnvelope
    connect?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
  }

  export type GameUncheckedCreateNestedManyWithoutPlayer1Input = {
    create?: XOR<GameCreateWithoutPlayer1Input, GameUncheckedCreateWithoutPlayer1Input> | GameCreateWithoutPlayer1Input[] | GameUncheckedCreateWithoutPlayer1Input[]
    connectOrCreate?: GameCreateOrConnectWithoutPlayer1Input | GameCreateOrConnectWithoutPlayer1Input[]
    createMany?: GameCreateManyPlayer1InputEnvelope
    connect?: GameWhereUniqueInput | GameWhereUniqueInput[]
  }

  export type GameUncheckedCreateNestedManyWithoutPlayer2Input = {
    create?: XOR<GameCreateWithoutPlayer2Input, GameUncheckedCreateWithoutPlayer2Input> | GameCreateWithoutPlayer2Input[] | GameUncheckedCreateWithoutPlayer2Input[]
    connectOrCreate?: GameCreateOrConnectWithoutPlayer2Input | GameCreateOrConnectWithoutPlayer2Input[]
    createMany?: GameCreateManyPlayer2InputEnvelope
    connect?: GameWhereUniqueInput | GameWhereUniqueInput[]
  }

  export type FleetUncheckedCreateNestedManyWithoutOwnerInput = {
    create?: XOR<FleetCreateWithoutOwnerInput, FleetUncheckedCreateWithoutOwnerInput> | FleetCreateWithoutOwnerInput[] | FleetUncheckedCreateWithoutOwnerInput[]
    connectOrCreate?: FleetCreateOrConnectWithoutOwnerInput | FleetCreateOrConnectWithoutOwnerInput[]
    createMany?: FleetCreateManyOwnerInputEnvelope
    connect?: FleetWhereUniqueInput | FleetWhereUniqueInput[]
  }

  export type PlayerStatsUncheckedCreateNestedOneWithoutUserInput = {
    create?: XOR<PlayerStatsCreateWithoutUserInput, PlayerStatsUncheckedCreateWithoutUserInput>
    connectOrCreate?: PlayerStatsCreateOrConnectWithoutUserInput
    connect?: PlayerStatsWhereUniqueInput
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type ShipUpdateManyWithoutOwnerNestedInput = {
    create?: XOR<ShipCreateWithoutOwnerInput, ShipUncheckedCreateWithoutOwnerInput> | ShipCreateWithoutOwnerInput[] | ShipUncheckedCreateWithoutOwnerInput[]
    connectOrCreate?: ShipCreateOrConnectWithoutOwnerInput | ShipCreateOrConnectWithoutOwnerInput[]
    upsert?: ShipUpsertWithWhereUniqueWithoutOwnerInput | ShipUpsertWithWhereUniqueWithoutOwnerInput[]
    createMany?: ShipCreateManyOwnerInputEnvelope
    set?: ShipWhereUniqueInput | ShipWhereUniqueInput[]
    disconnect?: ShipWhereUniqueInput | ShipWhereUniqueInput[]
    delete?: ShipWhereUniqueInput | ShipWhereUniqueInput[]
    connect?: ShipWhereUniqueInput | ShipWhereUniqueInput[]
    update?: ShipUpdateWithWhereUniqueWithoutOwnerInput | ShipUpdateWithWhereUniqueWithoutOwnerInput[]
    updateMany?: ShipUpdateManyWithWhereWithoutOwnerInput | ShipUpdateManyWithWhereWithoutOwnerInput[]
    deleteMany?: ShipScalarWhereInput | ShipScalarWhereInput[]
  }

  export type LobbyUpdateManyWithoutCreatorNestedInput = {
    create?: XOR<LobbyCreateWithoutCreatorInput, LobbyUncheckedCreateWithoutCreatorInput> | LobbyCreateWithoutCreatorInput[] | LobbyUncheckedCreateWithoutCreatorInput[]
    connectOrCreate?: LobbyCreateOrConnectWithoutCreatorInput | LobbyCreateOrConnectWithoutCreatorInput[]
    upsert?: LobbyUpsertWithWhereUniqueWithoutCreatorInput | LobbyUpsertWithWhereUniqueWithoutCreatorInput[]
    createMany?: LobbyCreateManyCreatorInputEnvelope
    set?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
    disconnect?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
    delete?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
    connect?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
    update?: LobbyUpdateWithWhereUniqueWithoutCreatorInput | LobbyUpdateWithWhereUniqueWithoutCreatorInput[]
    updateMany?: LobbyUpdateManyWithWhereWithoutCreatorInput | LobbyUpdateManyWithWhereWithoutCreatorInput[]
    deleteMany?: LobbyScalarWhereInput | LobbyScalarWhereInput[]
  }

  export type LobbyUpdateManyWithoutJoinerNestedInput = {
    create?: XOR<LobbyCreateWithoutJoinerInput, LobbyUncheckedCreateWithoutJoinerInput> | LobbyCreateWithoutJoinerInput[] | LobbyUncheckedCreateWithoutJoinerInput[]
    connectOrCreate?: LobbyCreateOrConnectWithoutJoinerInput | LobbyCreateOrConnectWithoutJoinerInput[]
    upsert?: LobbyUpsertWithWhereUniqueWithoutJoinerInput | LobbyUpsertWithWhereUniqueWithoutJoinerInput[]
    createMany?: LobbyCreateManyJoinerInputEnvelope
    set?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
    disconnect?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
    delete?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
    connect?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
    update?: LobbyUpdateWithWhereUniqueWithoutJoinerInput | LobbyUpdateWithWhereUniqueWithoutJoinerInput[]
    updateMany?: LobbyUpdateManyWithWhereWithoutJoinerInput | LobbyUpdateManyWithWhereWithoutJoinerInput[]
    deleteMany?: LobbyScalarWhereInput | LobbyScalarWhereInput[]
  }

  export type LobbyUpdateManyWithoutReservedJoinerNestedInput = {
    create?: XOR<LobbyCreateWithoutReservedJoinerInput, LobbyUncheckedCreateWithoutReservedJoinerInput> | LobbyCreateWithoutReservedJoinerInput[] | LobbyUncheckedCreateWithoutReservedJoinerInput[]
    connectOrCreate?: LobbyCreateOrConnectWithoutReservedJoinerInput | LobbyCreateOrConnectWithoutReservedJoinerInput[]
    upsert?: LobbyUpsertWithWhereUniqueWithoutReservedJoinerInput | LobbyUpsertWithWhereUniqueWithoutReservedJoinerInput[]
    createMany?: LobbyCreateManyReservedJoinerInputEnvelope
    set?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
    disconnect?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
    delete?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
    connect?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
    update?: LobbyUpdateWithWhereUniqueWithoutReservedJoinerInput | LobbyUpdateWithWhereUniqueWithoutReservedJoinerInput[]
    updateMany?: LobbyUpdateManyWithWhereWithoutReservedJoinerInput | LobbyUpdateManyWithWhereWithoutReservedJoinerInput[]
    deleteMany?: LobbyScalarWhereInput | LobbyScalarWhereInput[]
  }

  export type GameUpdateManyWithoutPlayer1NestedInput = {
    create?: XOR<GameCreateWithoutPlayer1Input, GameUncheckedCreateWithoutPlayer1Input> | GameCreateWithoutPlayer1Input[] | GameUncheckedCreateWithoutPlayer1Input[]
    connectOrCreate?: GameCreateOrConnectWithoutPlayer1Input | GameCreateOrConnectWithoutPlayer1Input[]
    upsert?: GameUpsertWithWhereUniqueWithoutPlayer1Input | GameUpsertWithWhereUniqueWithoutPlayer1Input[]
    createMany?: GameCreateManyPlayer1InputEnvelope
    set?: GameWhereUniqueInput | GameWhereUniqueInput[]
    disconnect?: GameWhereUniqueInput | GameWhereUniqueInput[]
    delete?: GameWhereUniqueInput | GameWhereUniqueInput[]
    connect?: GameWhereUniqueInput | GameWhereUniqueInput[]
    update?: GameUpdateWithWhereUniqueWithoutPlayer1Input | GameUpdateWithWhereUniqueWithoutPlayer1Input[]
    updateMany?: GameUpdateManyWithWhereWithoutPlayer1Input | GameUpdateManyWithWhereWithoutPlayer1Input[]
    deleteMany?: GameScalarWhereInput | GameScalarWhereInput[]
  }

  export type GameUpdateManyWithoutPlayer2NestedInput = {
    create?: XOR<GameCreateWithoutPlayer2Input, GameUncheckedCreateWithoutPlayer2Input> | GameCreateWithoutPlayer2Input[] | GameUncheckedCreateWithoutPlayer2Input[]
    connectOrCreate?: GameCreateOrConnectWithoutPlayer2Input | GameCreateOrConnectWithoutPlayer2Input[]
    upsert?: GameUpsertWithWhereUniqueWithoutPlayer2Input | GameUpsertWithWhereUniqueWithoutPlayer2Input[]
    createMany?: GameCreateManyPlayer2InputEnvelope
    set?: GameWhereUniqueInput | GameWhereUniqueInput[]
    disconnect?: GameWhereUniqueInput | GameWhereUniqueInput[]
    delete?: GameWhereUniqueInput | GameWhereUniqueInput[]
    connect?: GameWhereUniqueInput | GameWhereUniqueInput[]
    update?: GameUpdateWithWhereUniqueWithoutPlayer2Input | GameUpdateWithWhereUniqueWithoutPlayer2Input[]
    updateMany?: GameUpdateManyWithWhereWithoutPlayer2Input | GameUpdateManyWithWhereWithoutPlayer2Input[]
    deleteMany?: GameScalarWhereInput | GameScalarWhereInput[]
  }

  export type FleetUpdateManyWithoutOwnerNestedInput = {
    create?: XOR<FleetCreateWithoutOwnerInput, FleetUncheckedCreateWithoutOwnerInput> | FleetCreateWithoutOwnerInput[] | FleetUncheckedCreateWithoutOwnerInput[]
    connectOrCreate?: FleetCreateOrConnectWithoutOwnerInput | FleetCreateOrConnectWithoutOwnerInput[]
    upsert?: FleetUpsertWithWhereUniqueWithoutOwnerInput | FleetUpsertWithWhereUniqueWithoutOwnerInput[]
    createMany?: FleetCreateManyOwnerInputEnvelope
    set?: FleetWhereUniqueInput | FleetWhereUniqueInput[]
    disconnect?: FleetWhereUniqueInput | FleetWhereUniqueInput[]
    delete?: FleetWhereUniqueInput | FleetWhereUniqueInput[]
    connect?: FleetWhereUniqueInput | FleetWhereUniqueInput[]
    update?: FleetUpdateWithWhereUniqueWithoutOwnerInput | FleetUpdateWithWhereUniqueWithoutOwnerInput[]
    updateMany?: FleetUpdateManyWithWhereWithoutOwnerInput | FleetUpdateManyWithWhereWithoutOwnerInput[]
    deleteMany?: FleetScalarWhereInput | FleetScalarWhereInput[]
  }

  export type PlayerStatsUpdateOneWithoutUserNestedInput = {
    create?: XOR<PlayerStatsCreateWithoutUserInput, PlayerStatsUncheckedCreateWithoutUserInput>
    connectOrCreate?: PlayerStatsCreateOrConnectWithoutUserInput
    upsert?: PlayerStatsUpsertWithoutUserInput
    disconnect?: PlayerStatsWhereInput | boolean
    delete?: PlayerStatsWhereInput | boolean
    connect?: PlayerStatsWhereUniqueInput
    update?: XOR<XOR<PlayerStatsUpdateToOneWithWhereWithoutUserInput, PlayerStatsUpdateWithoutUserInput>, PlayerStatsUncheckedUpdateWithoutUserInput>
  }

  export type ShipUncheckedUpdateManyWithoutOwnerNestedInput = {
    create?: XOR<ShipCreateWithoutOwnerInput, ShipUncheckedCreateWithoutOwnerInput> | ShipCreateWithoutOwnerInput[] | ShipUncheckedCreateWithoutOwnerInput[]
    connectOrCreate?: ShipCreateOrConnectWithoutOwnerInput | ShipCreateOrConnectWithoutOwnerInput[]
    upsert?: ShipUpsertWithWhereUniqueWithoutOwnerInput | ShipUpsertWithWhereUniqueWithoutOwnerInput[]
    createMany?: ShipCreateManyOwnerInputEnvelope
    set?: ShipWhereUniqueInput | ShipWhereUniqueInput[]
    disconnect?: ShipWhereUniqueInput | ShipWhereUniqueInput[]
    delete?: ShipWhereUniqueInput | ShipWhereUniqueInput[]
    connect?: ShipWhereUniqueInput | ShipWhereUniqueInput[]
    update?: ShipUpdateWithWhereUniqueWithoutOwnerInput | ShipUpdateWithWhereUniqueWithoutOwnerInput[]
    updateMany?: ShipUpdateManyWithWhereWithoutOwnerInput | ShipUpdateManyWithWhereWithoutOwnerInput[]
    deleteMany?: ShipScalarWhereInput | ShipScalarWhereInput[]
  }

  export type LobbyUncheckedUpdateManyWithoutCreatorNestedInput = {
    create?: XOR<LobbyCreateWithoutCreatorInput, LobbyUncheckedCreateWithoutCreatorInput> | LobbyCreateWithoutCreatorInput[] | LobbyUncheckedCreateWithoutCreatorInput[]
    connectOrCreate?: LobbyCreateOrConnectWithoutCreatorInput | LobbyCreateOrConnectWithoutCreatorInput[]
    upsert?: LobbyUpsertWithWhereUniqueWithoutCreatorInput | LobbyUpsertWithWhereUniqueWithoutCreatorInput[]
    createMany?: LobbyCreateManyCreatorInputEnvelope
    set?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
    disconnect?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
    delete?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
    connect?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
    update?: LobbyUpdateWithWhereUniqueWithoutCreatorInput | LobbyUpdateWithWhereUniqueWithoutCreatorInput[]
    updateMany?: LobbyUpdateManyWithWhereWithoutCreatorInput | LobbyUpdateManyWithWhereWithoutCreatorInput[]
    deleteMany?: LobbyScalarWhereInput | LobbyScalarWhereInput[]
  }

  export type LobbyUncheckedUpdateManyWithoutJoinerNestedInput = {
    create?: XOR<LobbyCreateWithoutJoinerInput, LobbyUncheckedCreateWithoutJoinerInput> | LobbyCreateWithoutJoinerInput[] | LobbyUncheckedCreateWithoutJoinerInput[]
    connectOrCreate?: LobbyCreateOrConnectWithoutJoinerInput | LobbyCreateOrConnectWithoutJoinerInput[]
    upsert?: LobbyUpsertWithWhereUniqueWithoutJoinerInput | LobbyUpsertWithWhereUniqueWithoutJoinerInput[]
    createMany?: LobbyCreateManyJoinerInputEnvelope
    set?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
    disconnect?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
    delete?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
    connect?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
    update?: LobbyUpdateWithWhereUniqueWithoutJoinerInput | LobbyUpdateWithWhereUniqueWithoutJoinerInput[]
    updateMany?: LobbyUpdateManyWithWhereWithoutJoinerInput | LobbyUpdateManyWithWhereWithoutJoinerInput[]
    deleteMany?: LobbyScalarWhereInput | LobbyScalarWhereInput[]
  }

  export type LobbyUncheckedUpdateManyWithoutReservedJoinerNestedInput = {
    create?: XOR<LobbyCreateWithoutReservedJoinerInput, LobbyUncheckedCreateWithoutReservedJoinerInput> | LobbyCreateWithoutReservedJoinerInput[] | LobbyUncheckedCreateWithoutReservedJoinerInput[]
    connectOrCreate?: LobbyCreateOrConnectWithoutReservedJoinerInput | LobbyCreateOrConnectWithoutReservedJoinerInput[]
    upsert?: LobbyUpsertWithWhereUniqueWithoutReservedJoinerInput | LobbyUpsertWithWhereUniqueWithoutReservedJoinerInput[]
    createMany?: LobbyCreateManyReservedJoinerInputEnvelope
    set?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
    disconnect?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
    delete?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
    connect?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
    update?: LobbyUpdateWithWhereUniqueWithoutReservedJoinerInput | LobbyUpdateWithWhereUniqueWithoutReservedJoinerInput[]
    updateMany?: LobbyUpdateManyWithWhereWithoutReservedJoinerInput | LobbyUpdateManyWithWhereWithoutReservedJoinerInput[]
    deleteMany?: LobbyScalarWhereInput | LobbyScalarWhereInput[]
  }

  export type GameUncheckedUpdateManyWithoutPlayer1NestedInput = {
    create?: XOR<GameCreateWithoutPlayer1Input, GameUncheckedCreateWithoutPlayer1Input> | GameCreateWithoutPlayer1Input[] | GameUncheckedCreateWithoutPlayer1Input[]
    connectOrCreate?: GameCreateOrConnectWithoutPlayer1Input | GameCreateOrConnectWithoutPlayer1Input[]
    upsert?: GameUpsertWithWhereUniqueWithoutPlayer1Input | GameUpsertWithWhereUniqueWithoutPlayer1Input[]
    createMany?: GameCreateManyPlayer1InputEnvelope
    set?: GameWhereUniqueInput | GameWhereUniqueInput[]
    disconnect?: GameWhereUniqueInput | GameWhereUniqueInput[]
    delete?: GameWhereUniqueInput | GameWhereUniqueInput[]
    connect?: GameWhereUniqueInput | GameWhereUniqueInput[]
    update?: GameUpdateWithWhereUniqueWithoutPlayer1Input | GameUpdateWithWhereUniqueWithoutPlayer1Input[]
    updateMany?: GameUpdateManyWithWhereWithoutPlayer1Input | GameUpdateManyWithWhereWithoutPlayer1Input[]
    deleteMany?: GameScalarWhereInput | GameScalarWhereInput[]
  }

  export type GameUncheckedUpdateManyWithoutPlayer2NestedInput = {
    create?: XOR<GameCreateWithoutPlayer2Input, GameUncheckedCreateWithoutPlayer2Input> | GameCreateWithoutPlayer2Input[] | GameUncheckedCreateWithoutPlayer2Input[]
    connectOrCreate?: GameCreateOrConnectWithoutPlayer2Input | GameCreateOrConnectWithoutPlayer2Input[]
    upsert?: GameUpsertWithWhereUniqueWithoutPlayer2Input | GameUpsertWithWhereUniqueWithoutPlayer2Input[]
    createMany?: GameCreateManyPlayer2InputEnvelope
    set?: GameWhereUniqueInput | GameWhereUniqueInput[]
    disconnect?: GameWhereUniqueInput | GameWhereUniqueInput[]
    delete?: GameWhereUniqueInput | GameWhereUniqueInput[]
    connect?: GameWhereUniqueInput | GameWhereUniqueInput[]
    update?: GameUpdateWithWhereUniqueWithoutPlayer2Input | GameUpdateWithWhereUniqueWithoutPlayer2Input[]
    updateMany?: GameUpdateManyWithWhereWithoutPlayer2Input | GameUpdateManyWithWhereWithoutPlayer2Input[]
    deleteMany?: GameScalarWhereInput | GameScalarWhereInput[]
  }

  export type FleetUncheckedUpdateManyWithoutOwnerNestedInput = {
    create?: XOR<FleetCreateWithoutOwnerInput, FleetUncheckedCreateWithoutOwnerInput> | FleetCreateWithoutOwnerInput[] | FleetUncheckedCreateWithoutOwnerInput[]
    connectOrCreate?: FleetCreateOrConnectWithoutOwnerInput | FleetCreateOrConnectWithoutOwnerInput[]
    upsert?: FleetUpsertWithWhereUniqueWithoutOwnerInput | FleetUpsertWithWhereUniqueWithoutOwnerInput[]
    createMany?: FleetCreateManyOwnerInputEnvelope
    set?: FleetWhereUniqueInput | FleetWhereUniqueInput[]
    disconnect?: FleetWhereUniqueInput | FleetWhereUniqueInput[]
    delete?: FleetWhereUniqueInput | FleetWhereUniqueInput[]
    connect?: FleetWhereUniqueInput | FleetWhereUniqueInput[]
    update?: FleetUpdateWithWhereUniqueWithoutOwnerInput | FleetUpdateWithWhereUniqueWithoutOwnerInput[]
    updateMany?: FleetUpdateManyWithWhereWithoutOwnerInput | FleetUpdateManyWithWhereWithoutOwnerInput[]
    deleteMany?: FleetScalarWhereInput | FleetScalarWhereInput[]
  }

  export type PlayerStatsUncheckedUpdateOneWithoutUserNestedInput = {
    create?: XOR<PlayerStatsCreateWithoutUserInput, PlayerStatsUncheckedCreateWithoutUserInput>
    connectOrCreate?: PlayerStatsCreateOrConnectWithoutUserInput
    upsert?: PlayerStatsUpsertWithoutUserInput
    disconnect?: PlayerStatsWhereInput | boolean
    delete?: PlayerStatsWhereInput | boolean
    connect?: PlayerStatsWhereUniqueInput
    update?: XOR<XOR<PlayerStatsUpdateToOneWithWhereWithoutUserInput, PlayerStatsUpdateWithoutUserInput>, PlayerStatsUncheckedUpdateWithoutUserInput>
  }

  export type UserCreateNestedOneWithoutShipsInput = {
    create?: XOR<UserCreateWithoutShipsInput, UserUncheckedCreateWithoutShipsInput>
    connectOrCreate?: UserCreateOrConnectWithoutShipsInput
    connect?: UserWhereUniqueInput
  }

  export type UserUpdateOneRequiredWithoutShipsNestedInput = {
    create?: XOR<UserCreateWithoutShipsInput, UserUncheckedCreateWithoutShipsInput>
    connectOrCreate?: UserCreateOrConnectWithoutShipsInput
    upsert?: UserUpsertWithoutShipsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutShipsInput, UserUpdateWithoutShipsInput>, UserUncheckedUpdateWithoutShipsInput>
  }

  export type FleetCreateshipIdsInput = {
    set: number[]
  }

  export type UserCreateNestedOneWithoutFleetsInput = {
    create?: XOR<UserCreateWithoutFleetsInput, UserUncheckedCreateWithoutFleetsInput>
    connectOrCreate?: UserCreateOrConnectWithoutFleetsInput
    connect?: UserWhereUniqueInput
  }

  export type LobbyCreateNestedOneWithoutFleetsInput = {
    create?: XOR<LobbyCreateWithoutFleetsInput, LobbyUncheckedCreateWithoutFleetsInput>
    connectOrCreate?: LobbyCreateOrConnectWithoutFleetsInput
    connect?: LobbyWhereUniqueInput
  }

  export type FleetUpdateshipIdsInput = {
    set?: number[]
    push?: number | number[]
  }

  export type UserUpdateOneRequiredWithoutFleetsNestedInput = {
    create?: XOR<UserCreateWithoutFleetsInput, UserUncheckedCreateWithoutFleetsInput>
    connectOrCreate?: UserCreateOrConnectWithoutFleetsInput
    upsert?: UserUpsertWithoutFleetsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutFleetsInput, UserUpdateWithoutFleetsInput>, UserUncheckedUpdateWithoutFleetsInput>
  }

  export type LobbyUpdateOneRequiredWithoutFleetsNestedInput = {
    create?: XOR<LobbyCreateWithoutFleetsInput, LobbyUncheckedCreateWithoutFleetsInput>
    connectOrCreate?: LobbyCreateOrConnectWithoutFleetsInput
    upsert?: LobbyUpsertWithoutFleetsInput
    connect?: LobbyWhereUniqueInput
    update?: XOR<XOR<LobbyUpdateToOneWithWhereWithoutFleetsInput, LobbyUpdateWithoutFleetsInput>, LobbyUncheckedUpdateWithoutFleetsInput>
  }

  export type UserCreateNestedOneWithoutLobbiesCreatedInput = {
    create?: XOR<UserCreateWithoutLobbiesCreatedInput, UserUncheckedCreateWithoutLobbiesCreatedInput>
    connectOrCreate?: UserCreateOrConnectWithoutLobbiesCreatedInput
    connect?: UserWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutLobbiesJoinedInput = {
    create?: XOR<UserCreateWithoutLobbiesJoinedInput, UserUncheckedCreateWithoutLobbiesJoinedInput>
    connectOrCreate?: UserCreateOrConnectWithoutLobbiesJoinedInput
    connect?: UserWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutLobbiesReservedInput = {
    create?: XOR<UserCreateWithoutLobbiesReservedInput, UserUncheckedCreateWithoutLobbiesReservedInput>
    connectOrCreate?: UserCreateOrConnectWithoutLobbiesReservedInput
    connect?: UserWhereUniqueInput
  }

  export type MapCreateNestedOneWithoutLobbiesInput = {
    create?: XOR<MapCreateWithoutLobbiesInput, MapUncheckedCreateWithoutLobbiesInput>
    connectOrCreate?: MapCreateOrConnectWithoutLobbiesInput
    connect?: MapWhereUniqueInput
  }

  export type FleetCreateNestedManyWithoutLobbyInput = {
    create?: XOR<FleetCreateWithoutLobbyInput, FleetUncheckedCreateWithoutLobbyInput> | FleetCreateWithoutLobbyInput[] | FleetUncheckedCreateWithoutLobbyInput[]
    connectOrCreate?: FleetCreateOrConnectWithoutLobbyInput | FleetCreateOrConnectWithoutLobbyInput[]
    createMany?: FleetCreateManyLobbyInputEnvelope
    connect?: FleetWhereUniqueInput | FleetWhereUniqueInput[]
  }

  export type GameCreateNestedOneWithoutLobbyInput = {
    create?: XOR<GameCreateWithoutLobbyInput, GameUncheckedCreateWithoutLobbyInput>
    connectOrCreate?: GameCreateOrConnectWithoutLobbyInput
    connect?: GameWhereUniqueInput
  }

  export type FleetUncheckedCreateNestedManyWithoutLobbyInput = {
    create?: XOR<FleetCreateWithoutLobbyInput, FleetUncheckedCreateWithoutLobbyInput> | FleetCreateWithoutLobbyInput[] | FleetUncheckedCreateWithoutLobbyInput[]
    connectOrCreate?: FleetCreateOrConnectWithoutLobbyInput | FleetCreateOrConnectWithoutLobbyInput[]
    createMany?: FleetCreateManyLobbyInputEnvelope
    connect?: FleetWhereUniqueInput | FleetWhereUniqueInput[]
  }

  export type GameUncheckedCreateNestedOneWithoutLobbyInput = {
    create?: XOR<GameCreateWithoutLobbyInput, GameUncheckedCreateWithoutLobbyInput>
    connectOrCreate?: GameCreateOrConnectWithoutLobbyInput
    connect?: GameWhereUniqueInput
  }

  export type EnumLobbyStatusFieldUpdateOperationsInput = {
    set?: $Enums.LobbyStatus
  }

  export type NullableBoolFieldUpdateOperationsInput = {
    set?: boolean | null
  }

  export type UserUpdateOneRequiredWithoutLobbiesCreatedNestedInput = {
    create?: XOR<UserCreateWithoutLobbiesCreatedInput, UserUncheckedCreateWithoutLobbiesCreatedInput>
    connectOrCreate?: UserCreateOrConnectWithoutLobbiesCreatedInput
    upsert?: UserUpsertWithoutLobbiesCreatedInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutLobbiesCreatedInput, UserUpdateWithoutLobbiesCreatedInput>, UserUncheckedUpdateWithoutLobbiesCreatedInput>
  }

  export type UserUpdateOneWithoutLobbiesJoinedNestedInput = {
    create?: XOR<UserCreateWithoutLobbiesJoinedInput, UserUncheckedCreateWithoutLobbiesJoinedInput>
    connectOrCreate?: UserCreateOrConnectWithoutLobbiesJoinedInput
    upsert?: UserUpsertWithoutLobbiesJoinedInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutLobbiesJoinedInput, UserUpdateWithoutLobbiesJoinedInput>, UserUncheckedUpdateWithoutLobbiesJoinedInput>
  }

  export type UserUpdateOneWithoutLobbiesReservedNestedInput = {
    create?: XOR<UserCreateWithoutLobbiesReservedInput, UserUncheckedCreateWithoutLobbiesReservedInput>
    connectOrCreate?: UserCreateOrConnectWithoutLobbiesReservedInput
    upsert?: UserUpsertWithoutLobbiesReservedInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutLobbiesReservedInput, UserUpdateWithoutLobbiesReservedInput>, UserUncheckedUpdateWithoutLobbiesReservedInput>
  }

  export type MapUpdateOneWithoutLobbiesNestedInput = {
    create?: XOR<MapCreateWithoutLobbiesInput, MapUncheckedCreateWithoutLobbiesInput>
    connectOrCreate?: MapCreateOrConnectWithoutLobbiesInput
    upsert?: MapUpsertWithoutLobbiesInput
    disconnect?: MapWhereInput | boolean
    delete?: MapWhereInput | boolean
    connect?: MapWhereUniqueInput
    update?: XOR<XOR<MapUpdateToOneWithWhereWithoutLobbiesInput, MapUpdateWithoutLobbiesInput>, MapUncheckedUpdateWithoutLobbiesInput>
  }

  export type FleetUpdateManyWithoutLobbyNestedInput = {
    create?: XOR<FleetCreateWithoutLobbyInput, FleetUncheckedCreateWithoutLobbyInput> | FleetCreateWithoutLobbyInput[] | FleetUncheckedCreateWithoutLobbyInput[]
    connectOrCreate?: FleetCreateOrConnectWithoutLobbyInput | FleetCreateOrConnectWithoutLobbyInput[]
    upsert?: FleetUpsertWithWhereUniqueWithoutLobbyInput | FleetUpsertWithWhereUniqueWithoutLobbyInput[]
    createMany?: FleetCreateManyLobbyInputEnvelope
    set?: FleetWhereUniqueInput | FleetWhereUniqueInput[]
    disconnect?: FleetWhereUniqueInput | FleetWhereUniqueInput[]
    delete?: FleetWhereUniqueInput | FleetWhereUniqueInput[]
    connect?: FleetWhereUniqueInput | FleetWhereUniqueInput[]
    update?: FleetUpdateWithWhereUniqueWithoutLobbyInput | FleetUpdateWithWhereUniqueWithoutLobbyInput[]
    updateMany?: FleetUpdateManyWithWhereWithoutLobbyInput | FleetUpdateManyWithWhereWithoutLobbyInput[]
    deleteMany?: FleetScalarWhereInput | FleetScalarWhereInput[]
  }

  export type GameUpdateOneWithoutLobbyNestedInput = {
    create?: XOR<GameCreateWithoutLobbyInput, GameUncheckedCreateWithoutLobbyInput>
    connectOrCreate?: GameCreateOrConnectWithoutLobbyInput
    upsert?: GameUpsertWithoutLobbyInput
    disconnect?: GameWhereInput | boolean
    delete?: GameWhereInput | boolean
    connect?: GameWhereUniqueInput
    update?: XOR<XOR<GameUpdateToOneWithWhereWithoutLobbyInput, GameUpdateWithoutLobbyInput>, GameUncheckedUpdateWithoutLobbyInput>
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type FleetUncheckedUpdateManyWithoutLobbyNestedInput = {
    create?: XOR<FleetCreateWithoutLobbyInput, FleetUncheckedCreateWithoutLobbyInput> | FleetCreateWithoutLobbyInput[] | FleetUncheckedCreateWithoutLobbyInput[]
    connectOrCreate?: FleetCreateOrConnectWithoutLobbyInput | FleetCreateOrConnectWithoutLobbyInput[]
    upsert?: FleetUpsertWithWhereUniqueWithoutLobbyInput | FleetUpsertWithWhereUniqueWithoutLobbyInput[]
    createMany?: FleetCreateManyLobbyInputEnvelope
    set?: FleetWhereUniqueInput | FleetWhereUniqueInput[]
    disconnect?: FleetWhereUniqueInput | FleetWhereUniqueInput[]
    delete?: FleetWhereUniqueInput | FleetWhereUniqueInput[]
    connect?: FleetWhereUniqueInput | FleetWhereUniqueInput[]
    update?: FleetUpdateWithWhereUniqueWithoutLobbyInput | FleetUpdateWithWhereUniqueWithoutLobbyInput[]
    updateMany?: FleetUpdateManyWithWhereWithoutLobbyInput | FleetUpdateManyWithWhereWithoutLobbyInput[]
    deleteMany?: FleetScalarWhereInput | FleetScalarWhereInput[]
  }

  export type GameUncheckedUpdateOneWithoutLobbyNestedInput = {
    create?: XOR<GameCreateWithoutLobbyInput, GameUncheckedCreateWithoutLobbyInput>
    connectOrCreate?: GameCreateOrConnectWithoutLobbyInput
    upsert?: GameUpsertWithoutLobbyInput
    disconnect?: GameWhereInput | boolean
    delete?: GameWhereInput | boolean
    connect?: GameWhereUniqueInput
    update?: XOR<XOR<GameUpdateToOneWithWhereWithoutLobbyInput, GameUpdateWithoutLobbyInput>, GameUncheckedUpdateWithoutLobbyInput>
  }

  export type LobbyCreateNestedOneWithoutGameInput = {
    create?: XOR<LobbyCreateWithoutGameInput, LobbyUncheckedCreateWithoutGameInput>
    connectOrCreate?: LobbyCreateOrConnectWithoutGameInput
    connect?: LobbyWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutGamesAsPlayer1Input = {
    create?: XOR<UserCreateWithoutGamesAsPlayer1Input, UserUncheckedCreateWithoutGamesAsPlayer1Input>
    connectOrCreate?: UserCreateOrConnectWithoutGamesAsPlayer1Input
    connect?: UserWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutGamesAsPlayer2Input = {
    create?: XOR<UserCreateWithoutGamesAsPlayer2Input, UserUncheckedCreateWithoutGamesAsPlayer2Input>
    connectOrCreate?: UserCreateOrConnectWithoutGamesAsPlayer2Input
    connect?: UserWhereUniqueInput
  }

  export type GameTurnCreateNestedManyWithoutGameInput = {
    create?: XOR<GameTurnCreateWithoutGameInput, GameTurnUncheckedCreateWithoutGameInput> | GameTurnCreateWithoutGameInput[] | GameTurnUncheckedCreateWithoutGameInput[]
    connectOrCreate?: GameTurnCreateOrConnectWithoutGameInput | GameTurnCreateOrConnectWithoutGameInput[]
    createMany?: GameTurnCreateManyGameInputEnvelope
    connect?: GameTurnWhereUniqueInput | GameTurnWhereUniqueInput[]
  }

  export type GameTurnUncheckedCreateNestedManyWithoutGameInput = {
    create?: XOR<GameTurnCreateWithoutGameInput, GameTurnUncheckedCreateWithoutGameInput> | GameTurnCreateWithoutGameInput[] | GameTurnUncheckedCreateWithoutGameInput[]
    connectOrCreate?: GameTurnCreateOrConnectWithoutGameInput | GameTurnCreateOrConnectWithoutGameInput[]
    createMany?: GameTurnCreateManyGameInputEnvelope
    connect?: GameTurnWhereUniqueInput | GameTurnWhereUniqueInput[]
  }

  export type EnumGamePhaseFieldUpdateOperationsInput = {
    set?: $Enums.GamePhase
  }

  export type LobbyUpdateOneRequiredWithoutGameNestedInput = {
    create?: XOR<LobbyCreateWithoutGameInput, LobbyUncheckedCreateWithoutGameInput>
    connectOrCreate?: LobbyCreateOrConnectWithoutGameInput
    upsert?: LobbyUpsertWithoutGameInput
    connect?: LobbyWhereUniqueInput
    update?: XOR<XOR<LobbyUpdateToOneWithWhereWithoutGameInput, LobbyUpdateWithoutGameInput>, LobbyUncheckedUpdateWithoutGameInput>
  }

  export type UserUpdateOneRequiredWithoutGamesAsPlayer1NestedInput = {
    create?: XOR<UserCreateWithoutGamesAsPlayer1Input, UserUncheckedCreateWithoutGamesAsPlayer1Input>
    connectOrCreate?: UserCreateOrConnectWithoutGamesAsPlayer1Input
    upsert?: UserUpsertWithoutGamesAsPlayer1Input
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutGamesAsPlayer1Input, UserUpdateWithoutGamesAsPlayer1Input>, UserUncheckedUpdateWithoutGamesAsPlayer1Input>
  }

  export type UserUpdateOneRequiredWithoutGamesAsPlayer2NestedInput = {
    create?: XOR<UserCreateWithoutGamesAsPlayer2Input, UserUncheckedCreateWithoutGamesAsPlayer2Input>
    connectOrCreate?: UserCreateOrConnectWithoutGamesAsPlayer2Input
    upsert?: UserUpsertWithoutGamesAsPlayer2Input
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutGamesAsPlayer2Input, UserUpdateWithoutGamesAsPlayer2Input>, UserUncheckedUpdateWithoutGamesAsPlayer2Input>
  }

  export type GameTurnUpdateManyWithoutGameNestedInput = {
    create?: XOR<GameTurnCreateWithoutGameInput, GameTurnUncheckedCreateWithoutGameInput> | GameTurnCreateWithoutGameInput[] | GameTurnUncheckedCreateWithoutGameInput[]
    connectOrCreate?: GameTurnCreateOrConnectWithoutGameInput | GameTurnCreateOrConnectWithoutGameInput[]
    upsert?: GameTurnUpsertWithWhereUniqueWithoutGameInput | GameTurnUpsertWithWhereUniqueWithoutGameInput[]
    createMany?: GameTurnCreateManyGameInputEnvelope
    set?: GameTurnWhereUniqueInput | GameTurnWhereUniqueInput[]
    disconnect?: GameTurnWhereUniqueInput | GameTurnWhereUniqueInput[]
    delete?: GameTurnWhereUniqueInput | GameTurnWhereUniqueInput[]
    connect?: GameTurnWhereUniqueInput | GameTurnWhereUniqueInput[]
    update?: GameTurnUpdateWithWhereUniqueWithoutGameInput | GameTurnUpdateWithWhereUniqueWithoutGameInput[]
    updateMany?: GameTurnUpdateManyWithWhereWithoutGameInput | GameTurnUpdateManyWithWhereWithoutGameInput[]
    deleteMany?: GameTurnScalarWhereInput | GameTurnScalarWhereInput[]
  }

  export type GameTurnUncheckedUpdateManyWithoutGameNestedInput = {
    create?: XOR<GameTurnCreateWithoutGameInput, GameTurnUncheckedCreateWithoutGameInput> | GameTurnCreateWithoutGameInput[] | GameTurnUncheckedCreateWithoutGameInput[]
    connectOrCreate?: GameTurnCreateOrConnectWithoutGameInput | GameTurnCreateOrConnectWithoutGameInput[]
    upsert?: GameTurnUpsertWithWhereUniqueWithoutGameInput | GameTurnUpsertWithWhereUniqueWithoutGameInput[]
    createMany?: GameTurnCreateManyGameInputEnvelope
    set?: GameTurnWhereUniqueInput | GameTurnWhereUniqueInput[]
    disconnect?: GameTurnWhereUniqueInput | GameTurnWhereUniqueInput[]
    delete?: GameTurnWhereUniqueInput | GameTurnWhereUniqueInput[]
    connect?: GameTurnWhereUniqueInput | GameTurnWhereUniqueInput[]
    update?: GameTurnUpdateWithWhereUniqueWithoutGameInput | GameTurnUpdateWithWhereUniqueWithoutGameInput[]
    updateMany?: GameTurnUpdateManyWithWhereWithoutGameInput | GameTurnUpdateManyWithWhereWithoutGameInput[]
    deleteMany?: GameTurnScalarWhereInput | GameTurnScalarWhereInput[]
  }

  export type GameCreateNestedOneWithoutTurnsInput = {
    create?: XOR<GameCreateWithoutTurnsInput, GameUncheckedCreateWithoutTurnsInput>
    connectOrCreate?: GameCreateOrConnectWithoutTurnsInput
    connect?: GameWhereUniqueInput
  }

  export type GameUpdateOneRequiredWithoutTurnsNestedInput = {
    create?: XOR<GameCreateWithoutTurnsInput, GameUncheckedCreateWithoutTurnsInput>
    connectOrCreate?: GameCreateOrConnectWithoutTurnsInput
    upsert?: GameUpsertWithoutTurnsInput
    connect?: GameWhereUniqueInput
    update?: XOR<XOR<GameUpdateToOneWithWhereWithoutTurnsInput, GameUpdateWithoutTurnsInput>, GameUncheckedUpdateWithoutTurnsInput>
  }

  export type LobbyCreateNestedManyWithoutMapInput = {
    create?: XOR<LobbyCreateWithoutMapInput, LobbyUncheckedCreateWithoutMapInput> | LobbyCreateWithoutMapInput[] | LobbyUncheckedCreateWithoutMapInput[]
    connectOrCreate?: LobbyCreateOrConnectWithoutMapInput | LobbyCreateOrConnectWithoutMapInput[]
    createMany?: LobbyCreateManyMapInputEnvelope
    connect?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
  }

  export type LobbyUncheckedCreateNestedManyWithoutMapInput = {
    create?: XOR<LobbyCreateWithoutMapInput, LobbyUncheckedCreateWithoutMapInput> | LobbyCreateWithoutMapInput[] | LobbyUncheckedCreateWithoutMapInput[]
    connectOrCreate?: LobbyCreateOrConnectWithoutMapInput | LobbyCreateOrConnectWithoutMapInput[]
    createMany?: LobbyCreateManyMapInputEnvelope
    connect?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
  }

  export type LobbyUpdateManyWithoutMapNestedInput = {
    create?: XOR<LobbyCreateWithoutMapInput, LobbyUncheckedCreateWithoutMapInput> | LobbyCreateWithoutMapInput[] | LobbyUncheckedCreateWithoutMapInput[]
    connectOrCreate?: LobbyCreateOrConnectWithoutMapInput | LobbyCreateOrConnectWithoutMapInput[]
    upsert?: LobbyUpsertWithWhereUniqueWithoutMapInput | LobbyUpsertWithWhereUniqueWithoutMapInput[]
    createMany?: LobbyCreateManyMapInputEnvelope
    set?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
    disconnect?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
    delete?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
    connect?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
    update?: LobbyUpdateWithWhereUniqueWithoutMapInput | LobbyUpdateWithWhereUniqueWithoutMapInput[]
    updateMany?: LobbyUpdateManyWithWhereWithoutMapInput | LobbyUpdateManyWithWhereWithoutMapInput[]
    deleteMany?: LobbyScalarWhereInput | LobbyScalarWhereInput[]
  }

  export type LobbyUncheckedUpdateManyWithoutMapNestedInput = {
    create?: XOR<LobbyCreateWithoutMapInput, LobbyUncheckedCreateWithoutMapInput> | LobbyCreateWithoutMapInput[] | LobbyUncheckedCreateWithoutMapInput[]
    connectOrCreate?: LobbyCreateOrConnectWithoutMapInput | LobbyCreateOrConnectWithoutMapInput[]
    upsert?: LobbyUpsertWithWhereUniqueWithoutMapInput | LobbyUpsertWithWhereUniqueWithoutMapInput[]
    createMany?: LobbyCreateManyMapInputEnvelope
    set?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
    disconnect?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
    delete?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
    connect?: LobbyWhereUniqueInput | LobbyWhereUniqueInput[]
    update?: LobbyUpdateWithWhereUniqueWithoutMapInput | LobbyUpdateWithWhereUniqueWithoutMapInput[]
    updateMany?: LobbyUpdateManyWithWhereWithoutMapInput | LobbyUpdateManyWithWhereWithoutMapInput[]
    deleteMany?: LobbyScalarWhereInput | LobbyScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutStatsInput = {
    create?: XOR<UserCreateWithoutStatsInput, UserUncheckedCreateWithoutStatsInput>
    connectOrCreate?: UserCreateOrConnectWithoutStatsInput
    connect?: UserWhereUniqueInput
  }

  export type UserUpdateOneRequiredWithoutStatsNestedInput = {
    create?: XOR<UserCreateWithoutStatsInput, UserUncheckedCreateWithoutStatsInput>
    connectOrCreate?: UserCreateOrConnectWithoutStatsInput
    upsert?: UserUpsertWithoutStatsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutStatsInput, UserUpdateWithoutStatsInput>, UserUncheckedUpdateWithoutStatsInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }
  export type NestedJsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }
  export type NestedJsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedEnumLobbyStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.LobbyStatus | EnumLobbyStatusFieldRefInput<$PrismaModel>
    in?: $Enums.LobbyStatus[] | ListEnumLobbyStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.LobbyStatus[] | ListEnumLobbyStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumLobbyStatusFilter<$PrismaModel> | $Enums.LobbyStatus
  }

  export type NestedBoolNullableFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableFilter<$PrismaModel> | boolean | null
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedEnumLobbyStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.LobbyStatus | EnumLobbyStatusFieldRefInput<$PrismaModel>
    in?: $Enums.LobbyStatus[] | ListEnumLobbyStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.LobbyStatus[] | ListEnumLobbyStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumLobbyStatusWithAggregatesFilter<$PrismaModel> | $Enums.LobbyStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumLobbyStatusFilter<$PrismaModel>
    _max?: NestedEnumLobbyStatusFilter<$PrismaModel>
  }

  export type NestedBoolNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableWithAggregatesFilter<$PrismaModel> | boolean | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedBoolNullableFilter<$PrismaModel>
    _max?: NestedBoolNullableFilter<$PrismaModel>
  }

  export type NestedEnumGamePhaseFilter<$PrismaModel = never> = {
    equals?: $Enums.GamePhase | EnumGamePhaseFieldRefInput<$PrismaModel>
    in?: $Enums.GamePhase[] | ListEnumGamePhaseFieldRefInput<$PrismaModel>
    notIn?: $Enums.GamePhase[] | ListEnumGamePhaseFieldRefInput<$PrismaModel>
    not?: NestedEnumGamePhaseFilter<$PrismaModel> | $Enums.GamePhase
  }

  export type NestedEnumGamePhaseWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.GamePhase | EnumGamePhaseFieldRefInput<$PrismaModel>
    in?: $Enums.GamePhase[] | ListEnumGamePhaseFieldRefInput<$PrismaModel>
    notIn?: $Enums.GamePhase[] | ListEnumGamePhaseFieldRefInput<$PrismaModel>
    not?: NestedEnumGamePhaseWithAggregatesFilter<$PrismaModel> | $Enums.GamePhase
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumGamePhaseFilter<$PrismaModel>
    _max?: NestedEnumGamePhaseFilter<$PrismaModel>
  }

  export type ShipCreateWithoutOwnerInput = {
    name?: string
    equipment: JsonNullValueInput | InputJsonValue
    traits: JsonNullValueInput | InputJsonValue
    cost?: number
    costsVersion?: number
    isFree?: boolean
    modifiedCount?: number
    shiny?: boolean
    constructed?: boolean
    inFleet?: boolean
    destroyed?: boolean
    shipsDestroyed?: number
    destroyedAt?: Date | string | null
    createdAt?: Date | string
  }

  export type ShipUncheckedCreateWithoutOwnerInput = {
    id?: number
    name?: string
    equipment: JsonNullValueInput | InputJsonValue
    traits: JsonNullValueInput | InputJsonValue
    cost?: number
    costsVersion?: number
    isFree?: boolean
    modifiedCount?: number
    shiny?: boolean
    constructed?: boolean
    inFleet?: boolean
    destroyed?: boolean
    shipsDestroyed?: number
    destroyedAt?: Date | string | null
    createdAt?: Date | string
  }

  export type ShipCreateOrConnectWithoutOwnerInput = {
    where: ShipWhereUniqueInput
    create: XOR<ShipCreateWithoutOwnerInput, ShipUncheckedCreateWithoutOwnerInput>
  }

  export type ShipCreateManyOwnerInputEnvelope = {
    data: ShipCreateManyOwnerInput | ShipCreateManyOwnerInput[]
    skipDuplicates?: boolean
  }

  export type LobbyCreateWithoutCreatorInput = {
    status?: $Enums.LobbyStatus
    costLimit?: number
    turnTimeSeconds?: number
    maxScore?: number
    creatorGoesFirst?: boolean | null
    isAiGame?: boolean
    aiDifficulty?: string | null
    createdAt?: Date | string
    joinedAt?: Date | string | null
    joinerFleetSetAt?: Date | string | null
    joiner?: UserCreateNestedOneWithoutLobbiesJoinedInput
    reservedJoiner?: UserCreateNestedOneWithoutLobbiesReservedInput
    map?: MapCreateNestedOneWithoutLobbiesInput
    fleets?: FleetCreateNestedManyWithoutLobbyInput
    game?: GameCreateNestedOneWithoutLobbyInput
  }

  export type LobbyUncheckedCreateWithoutCreatorInput = {
    id?: number
    joinerId?: string | null
    reservedJoinerId?: string | null
    mapId?: number | null
    status?: $Enums.LobbyStatus
    costLimit?: number
    turnTimeSeconds?: number
    maxScore?: number
    creatorGoesFirst?: boolean | null
    isAiGame?: boolean
    aiDifficulty?: string | null
    createdAt?: Date | string
    joinedAt?: Date | string | null
    joinerFleetSetAt?: Date | string | null
    fleets?: FleetUncheckedCreateNestedManyWithoutLobbyInput
    game?: GameUncheckedCreateNestedOneWithoutLobbyInput
  }

  export type LobbyCreateOrConnectWithoutCreatorInput = {
    where: LobbyWhereUniqueInput
    create: XOR<LobbyCreateWithoutCreatorInput, LobbyUncheckedCreateWithoutCreatorInput>
  }

  export type LobbyCreateManyCreatorInputEnvelope = {
    data: LobbyCreateManyCreatorInput | LobbyCreateManyCreatorInput[]
    skipDuplicates?: boolean
  }

  export type LobbyCreateWithoutJoinerInput = {
    status?: $Enums.LobbyStatus
    costLimit?: number
    turnTimeSeconds?: number
    maxScore?: number
    creatorGoesFirst?: boolean | null
    isAiGame?: boolean
    aiDifficulty?: string | null
    createdAt?: Date | string
    joinedAt?: Date | string | null
    joinerFleetSetAt?: Date | string | null
    creator: UserCreateNestedOneWithoutLobbiesCreatedInput
    reservedJoiner?: UserCreateNestedOneWithoutLobbiesReservedInput
    map?: MapCreateNestedOneWithoutLobbiesInput
    fleets?: FleetCreateNestedManyWithoutLobbyInput
    game?: GameCreateNestedOneWithoutLobbyInput
  }

  export type LobbyUncheckedCreateWithoutJoinerInput = {
    id?: number
    creatorId: string
    reservedJoinerId?: string | null
    mapId?: number | null
    status?: $Enums.LobbyStatus
    costLimit?: number
    turnTimeSeconds?: number
    maxScore?: number
    creatorGoesFirst?: boolean | null
    isAiGame?: boolean
    aiDifficulty?: string | null
    createdAt?: Date | string
    joinedAt?: Date | string | null
    joinerFleetSetAt?: Date | string | null
    fleets?: FleetUncheckedCreateNestedManyWithoutLobbyInput
    game?: GameUncheckedCreateNestedOneWithoutLobbyInput
  }

  export type LobbyCreateOrConnectWithoutJoinerInput = {
    where: LobbyWhereUniqueInput
    create: XOR<LobbyCreateWithoutJoinerInput, LobbyUncheckedCreateWithoutJoinerInput>
  }

  export type LobbyCreateManyJoinerInputEnvelope = {
    data: LobbyCreateManyJoinerInput | LobbyCreateManyJoinerInput[]
    skipDuplicates?: boolean
  }

  export type LobbyCreateWithoutReservedJoinerInput = {
    status?: $Enums.LobbyStatus
    costLimit?: number
    turnTimeSeconds?: number
    maxScore?: number
    creatorGoesFirst?: boolean | null
    isAiGame?: boolean
    aiDifficulty?: string | null
    createdAt?: Date | string
    joinedAt?: Date | string | null
    joinerFleetSetAt?: Date | string | null
    creator: UserCreateNestedOneWithoutLobbiesCreatedInput
    joiner?: UserCreateNestedOneWithoutLobbiesJoinedInput
    map?: MapCreateNestedOneWithoutLobbiesInput
    fleets?: FleetCreateNestedManyWithoutLobbyInput
    game?: GameCreateNestedOneWithoutLobbyInput
  }

  export type LobbyUncheckedCreateWithoutReservedJoinerInput = {
    id?: number
    creatorId: string
    joinerId?: string | null
    mapId?: number | null
    status?: $Enums.LobbyStatus
    costLimit?: number
    turnTimeSeconds?: number
    maxScore?: number
    creatorGoesFirst?: boolean | null
    isAiGame?: boolean
    aiDifficulty?: string | null
    createdAt?: Date | string
    joinedAt?: Date | string | null
    joinerFleetSetAt?: Date | string | null
    fleets?: FleetUncheckedCreateNestedManyWithoutLobbyInput
    game?: GameUncheckedCreateNestedOneWithoutLobbyInput
  }

  export type LobbyCreateOrConnectWithoutReservedJoinerInput = {
    where: LobbyWhereUniqueInput
    create: XOR<LobbyCreateWithoutReservedJoinerInput, LobbyUncheckedCreateWithoutReservedJoinerInput>
  }

  export type LobbyCreateManyReservedJoinerInputEnvelope = {
    data: LobbyCreateManyReservedJoinerInput | LobbyCreateManyReservedJoinerInput[]
    skipDuplicates?: boolean
  }

  export type GameCreateWithoutPlayer1Input = {
    state: JsonNullValueInput | InputJsonValue
    initialState?: NullableJsonNullValueInput | InputJsonValue
    currentTurn: string
    currentRound?: number
    phase?: $Enums.GamePhase
    winnerId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    lobby: LobbyCreateNestedOneWithoutGameInput
    player2: UserCreateNestedOneWithoutGamesAsPlayer2Input
    turns?: GameTurnCreateNestedManyWithoutGameInput
  }

  export type GameUncheckedCreateWithoutPlayer1Input = {
    id?: number
    lobbyId: number
    player2Id: string
    state: JsonNullValueInput | InputJsonValue
    initialState?: NullableJsonNullValueInput | InputJsonValue
    currentTurn: string
    currentRound?: number
    phase?: $Enums.GamePhase
    winnerId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    turns?: GameTurnUncheckedCreateNestedManyWithoutGameInput
  }

  export type GameCreateOrConnectWithoutPlayer1Input = {
    where: GameWhereUniqueInput
    create: XOR<GameCreateWithoutPlayer1Input, GameUncheckedCreateWithoutPlayer1Input>
  }

  export type GameCreateManyPlayer1InputEnvelope = {
    data: GameCreateManyPlayer1Input | GameCreateManyPlayer1Input[]
    skipDuplicates?: boolean
  }

  export type GameCreateWithoutPlayer2Input = {
    state: JsonNullValueInput | InputJsonValue
    initialState?: NullableJsonNullValueInput | InputJsonValue
    currentTurn: string
    currentRound?: number
    phase?: $Enums.GamePhase
    winnerId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    lobby: LobbyCreateNestedOneWithoutGameInput
    player1: UserCreateNestedOneWithoutGamesAsPlayer1Input
    turns?: GameTurnCreateNestedManyWithoutGameInput
  }

  export type GameUncheckedCreateWithoutPlayer2Input = {
    id?: number
    lobbyId: number
    player1Id: string
    state: JsonNullValueInput | InputJsonValue
    initialState?: NullableJsonNullValueInput | InputJsonValue
    currentTurn: string
    currentRound?: number
    phase?: $Enums.GamePhase
    winnerId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    turns?: GameTurnUncheckedCreateNestedManyWithoutGameInput
  }

  export type GameCreateOrConnectWithoutPlayer2Input = {
    where: GameWhereUniqueInput
    create: XOR<GameCreateWithoutPlayer2Input, GameUncheckedCreateWithoutPlayer2Input>
  }

  export type GameCreateManyPlayer2InputEnvelope = {
    data: GameCreateManyPlayer2Input | GameCreateManyPlayer2Input[]
    skipDuplicates?: boolean
  }

  export type FleetCreateWithoutOwnerInput = {
    shipIds?: FleetCreateshipIdsInput | number[]
    totalCost?: number
    isComplete?: boolean
    startingPositions?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    lobby: LobbyCreateNestedOneWithoutFleetsInput
  }

  export type FleetUncheckedCreateWithoutOwnerInput = {
    id?: number
    lobbyId: number
    shipIds?: FleetCreateshipIdsInput | number[]
    totalCost?: number
    isComplete?: boolean
    startingPositions?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type FleetCreateOrConnectWithoutOwnerInput = {
    where: FleetWhereUniqueInput
    create: XOR<FleetCreateWithoutOwnerInput, FleetUncheckedCreateWithoutOwnerInput>
  }

  export type FleetCreateManyOwnerInputEnvelope = {
    data: FleetCreateManyOwnerInput | FleetCreateManyOwnerInput[]
    skipDuplicates?: boolean
  }

  export type PlayerStatsCreateWithoutUserInput = {
    wins?: number
    losses?: number
    draws?: number
    totalGames?: number
  }

  export type PlayerStatsUncheckedCreateWithoutUserInput = {
    wins?: number
    losses?: number
    draws?: number
    totalGames?: number
  }

  export type PlayerStatsCreateOrConnectWithoutUserInput = {
    where: PlayerStatsWhereUniqueInput
    create: XOR<PlayerStatsCreateWithoutUserInput, PlayerStatsUncheckedCreateWithoutUserInput>
  }

  export type ShipUpsertWithWhereUniqueWithoutOwnerInput = {
    where: ShipWhereUniqueInput
    update: XOR<ShipUpdateWithoutOwnerInput, ShipUncheckedUpdateWithoutOwnerInput>
    create: XOR<ShipCreateWithoutOwnerInput, ShipUncheckedCreateWithoutOwnerInput>
  }

  export type ShipUpdateWithWhereUniqueWithoutOwnerInput = {
    where: ShipWhereUniqueInput
    data: XOR<ShipUpdateWithoutOwnerInput, ShipUncheckedUpdateWithoutOwnerInput>
  }

  export type ShipUpdateManyWithWhereWithoutOwnerInput = {
    where: ShipScalarWhereInput
    data: XOR<ShipUpdateManyMutationInput, ShipUncheckedUpdateManyWithoutOwnerInput>
  }

  export type ShipScalarWhereInput = {
    AND?: ShipScalarWhereInput | ShipScalarWhereInput[]
    OR?: ShipScalarWhereInput[]
    NOT?: ShipScalarWhereInput | ShipScalarWhereInput[]
    id?: IntFilter<"Ship"> | number
    ownerId?: StringFilter<"Ship"> | string
    name?: StringFilter<"Ship"> | string
    equipment?: JsonFilter<"Ship">
    traits?: JsonFilter<"Ship">
    cost?: IntFilter<"Ship"> | number
    costsVersion?: IntFilter<"Ship"> | number
    isFree?: BoolFilter<"Ship"> | boolean
    modifiedCount?: IntFilter<"Ship"> | number
    shiny?: BoolFilter<"Ship"> | boolean
    constructed?: BoolFilter<"Ship"> | boolean
    inFleet?: BoolFilter<"Ship"> | boolean
    destroyed?: BoolFilter<"Ship"> | boolean
    shipsDestroyed?: IntFilter<"Ship"> | number
    destroyedAt?: DateTimeNullableFilter<"Ship"> | Date | string | null
    createdAt?: DateTimeFilter<"Ship"> | Date | string
  }

  export type LobbyUpsertWithWhereUniqueWithoutCreatorInput = {
    where: LobbyWhereUniqueInput
    update: XOR<LobbyUpdateWithoutCreatorInput, LobbyUncheckedUpdateWithoutCreatorInput>
    create: XOR<LobbyCreateWithoutCreatorInput, LobbyUncheckedCreateWithoutCreatorInput>
  }

  export type LobbyUpdateWithWhereUniqueWithoutCreatorInput = {
    where: LobbyWhereUniqueInput
    data: XOR<LobbyUpdateWithoutCreatorInput, LobbyUncheckedUpdateWithoutCreatorInput>
  }

  export type LobbyUpdateManyWithWhereWithoutCreatorInput = {
    where: LobbyScalarWhereInput
    data: XOR<LobbyUpdateManyMutationInput, LobbyUncheckedUpdateManyWithoutCreatorInput>
  }

  export type LobbyScalarWhereInput = {
    AND?: LobbyScalarWhereInput | LobbyScalarWhereInput[]
    OR?: LobbyScalarWhereInput[]
    NOT?: LobbyScalarWhereInput | LobbyScalarWhereInput[]
    id?: IntFilter<"Lobby"> | number
    creatorId?: StringFilter<"Lobby"> | string
    joinerId?: StringNullableFilter<"Lobby"> | string | null
    reservedJoinerId?: StringNullableFilter<"Lobby"> | string | null
    mapId?: IntNullableFilter<"Lobby"> | number | null
    status?: EnumLobbyStatusFilter<"Lobby"> | $Enums.LobbyStatus
    costLimit?: IntFilter<"Lobby"> | number
    turnTimeSeconds?: IntFilter<"Lobby"> | number
    maxScore?: IntFilter<"Lobby"> | number
    creatorGoesFirst?: BoolNullableFilter<"Lobby"> | boolean | null
    isAiGame?: BoolFilter<"Lobby"> | boolean
    aiDifficulty?: StringNullableFilter<"Lobby"> | string | null
    createdAt?: DateTimeFilter<"Lobby"> | Date | string
    joinedAt?: DateTimeNullableFilter<"Lobby"> | Date | string | null
    joinerFleetSetAt?: DateTimeNullableFilter<"Lobby"> | Date | string | null
  }

  export type LobbyUpsertWithWhereUniqueWithoutJoinerInput = {
    where: LobbyWhereUniqueInput
    update: XOR<LobbyUpdateWithoutJoinerInput, LobbyUncheckedUpdateWithoutJoinerInput>
    create: XOR<LobbyCreateWithoutJoinerInput, LobbyUncheckedCreateWithoutJoinerInput>
  }

  export type LobbyUpdateWithWhereUniqueWithoutJoinerInput = {
    where: LobbyWhereUniqueInput
    data: XOR<LobbyUpdateWithoutJoinerInput, LobbyUncheckedUpdateWithoutJoinerInput>
  }

  export type LobbyUpdateManyWithWhereWithoutJoinerInput = {
    where: LobbyScalarWhereInput
    data: XOR<LobbyUpdateManyMutationInput, LobbyUncheckedUpdateManyWithoutJoinerInput>
  }

  export type LobbyUpsertWithWhereUniqueWithoutReservedJoinerInput = {
    where: LobbyWhereUniqueInput
    update: XOR<LobbyUpdateWithoutReservedJoinerInput, LobbyUncheckedUpdateWithoutReservedJoinerInput>
    create: XOR<LobbyCreateWithoutReservedJoinerInput, LobbyUncheckedCreateWithoutReservedJoinerInput>
  }

  export type LobbyUpdateWithWhereUniqueWithoutReservedJoinerInput = {
    where: LobbyWhereUniqueInput
    data: XOR<LobbyUpdateWithoutReservedJoinerInput, LobbyUncheckedUpdateWithoutReservedJoinerInput>
  }

  export type LobbyUpdateManyWithWhereWithoutReservedJoinerInput = {
    where: LobbyScalarWhereInput
    data: XOR<LobbyUpdateManyMutationInput, LobbyUncheckedUpdateManyWithoutReservedJoinerInput>
  }

  export type GameUpsertWithWhereUniqueWithoutPlayer1Input = {
    where: GameWhereUniqueInput
    update: XOR<GameUpdateWithoutPlayer1Input, GameUncheckedUpdateWithoutPlayer1Input>
    create: XOR<GameCreateWithoutPlayer1Input, GameUncheckedCreateWithoutPlayer1Input>
  }

  export type GameUpdateWithWhereUniqueWithoutPlayer1Input = {
    where: GameWhereUniqueInput
    data: XOR<GameUpdateWithoutPlayer1Input, GameUncheckedUpdateWithoutPlayer1Input>
  }

  export type GameUpdateManyWithWhereWithoutPlayer1Input = {
    where: GameScalarWhereInput
    data: XOR<GameUpdateManyMutationInput, GameUncheckedUpdateManyWithoutPlayer1Input>
  }

  export type GameScalarWhereInput = {
    AND?: GameScalarWhereInput | GameScalarWhereInput[]
    OR?: GameScalarWhereInput[]
    NOT?: GameScalarWhereInput | GameScalarWhereInput[]
    id?: IntFilter<"Game"> | number
    lobbyId?: IntFilter<"Game"> | number
    player1Id?: StringFilter<"Game"> | string
    player2Id?: StringFilter<"Game"> | string
    state?: JsonFilter<"Game">
    initialState?: JsonNullableFilter<"Game">
    currentTurn?: StringFilter<"Game"> | string
    currentRound?: IntFilter<"Game"> | number
    phase?: EnumGamePhaseFilter<"Game"> | $Enums.GamePhase
    winnerId?: StringNullableFilter<"Game"> | string | null
    createdAt?: DateTimeFilter<"Game"> | Date | string
    updatedAt?: DateTimeFilter<"Game"> | Date | string
  }

  export type GameUpsertWithWhereUniqueWithoutPlayer2Input = {
    where: GameWhereUniqueInput
    update: XOR<GameUpdateWithoutPlayer2Input, GameUncheckedUpdateWithoutPlayer2Input>
    create: XOR<GameCreateWithoutPlayer2Input, GameUncheckedCreateWithoutPlayer2Input>
  }

  export type GameUpdateWithWhereUniqueWithoutPlayer2Input = {
    where: GameWhereUniqueInput
    data: XOR<GameUpdateWithoutPlayer2Input, GameUncheckedUpdateWithoutPlayer2Input>
  }

  export type GameUpdateManyWithWhereWithoutPlayer2Input = {
    where: GameScalarWhereInput
    data: XOR<GameUpdateManyMutationInput, GameUncheckedUpdateManyWithoutPlayer2Input>
  }

  export type FleetUpsertWithWhereUniqueWithoutOwnerInput = {
    where: FleetWhereUniqueInput
    update: XOR<FleetUpdateWithoutOwnerInput, FleetUncheckedUpdateWithoutOwnerInput>
    create: XOR<FleetCreateWithoutOwnerInput, FleetUncheckedCreateWithoutOwnerInput>
  }

  export type FleetUpdateWithWhereUniqueWithoutOwnerInput = {
    where: FleetWhereUniqueInput
    data: XOR<FleetUpdateWithoutOwnerInput, FleetUncheckedUpdateWithoutOwnerInput>
  }

  export type FleetUpdateManyWithWhereWithoutOwnerInput = {
    where: FleetScalarWhereInput
    data: XOR<FleetUpdateManyMutationInput, FleetUncheckedUpdateManyWithoutOwnerInput>
  }

  export type FleetScalarWhereInput = {
    AND?: FleetScalarWhereInput | FleetScalarWhereInput[]
    OR?: FleetScalarWhereInput[]
    NOT?: FleetScalarWhereInput | FleetScalarWhereInput[]
    id?: IntFilter<"Fleet"> | number
    ownerId?: StringFilter<"Fleet"> | string
    lobbyId?: IntFilter<"Fleet"> | number
    shipIds?: IntNullableListFilter<"Fleet">
    totalCost?: IntFilter<"Fleet"> | number
    isComplete?: BoolFilter<"Fleet"> | boolean
    startingPositions?: JsonNullableFilter<"Fleet">
    createdAt?: DateTimeFilter<"Fleet"> | Date | string
  }

  export type PlayerStatsUpsertWithoutUserInput = {
    update: XOR<PlayerStatsUpdateWithoutUserInput, PlayerStatsUncheckedUpdateWithoutUserInput>
    create: XOR<PlayerStatsCreateWithoutUserInput, PlayerStatsUncheckedCreateWithoutUserInput>
    where?: PlayerStatsWhereInput
  }

  export type PlayerStatsUpdateToOneWithWhereWithoutUserInput = {
    where?: PlayerStatsWhereInput
    data: XOR<PlayerStatsUpdateWithoutUserInput, PlayerStatsUncheckedUpdateWithoutUserInput>
  }

  export type PlayerStatsUpdateWithoutUserInput = {
    wins?: IntFieldUpdateOperationsInput | number
    losses?: IntFieldUpdateOperationsInput | number
    draws?: IntFieldUpdateOperationsInput | number
    totalGames?: IntFieldUpdateOperationsInput | number
  }

  export type PlayerStatsUncheckedUpdateWithoutUserInput = {
    wins?: IntFieldUpdateOperationsInput | number
    losses?: IntFieldUpdateOperationsInput | number
    draws?: IntFieldUpdateOperationsInput | number
    totalGames?: IntFieldUpdateOperationsInput | number
  }

  export type UserCreateWithoutShipsInput = {
    id: string
    email: string
    username?: string | null
    creditBalance?: number
    purchasedShipCount?: number
    lobbiesCreatedCount?: number
    kickCount?: number
    kickTimeoutUntil?: Date | string | null
    tutorialCompleted?: boolean
    tutorialPath?: string | null
    createdAt?: Date | string
    lobbiesCreated?: LobbyCreateNestedManyWithoutCreatorInput
    lobbiesJoined?: LobbyCreateNestedManyWithoutJoinerInput
    lobbiesReserved?: LobbyCreateNestedManyWithoutReservedJoinerInput
    gamesAsPlayer1?: GameCreateNestedManyWithoutPlayer1Input
    gamesAsPlayer2?: GameCreateNestedManyWithoutPlayer2Input
    fleets?: FleetCreateNestedManyWithoutOwnerInput
    stats?: PlayerStatsCreateNestedOneWithoutUserInput
  }

  export type UserUncheckedCreateWithoutShipsInput = {
    id: string
    email: string
    username?: string | null
    creditBalance?: number
    purchasedShipCount?: number
    lobbiesCreatedCount?: number
    kickCount?: number
    kickTimeoutUntil?: Date | string | null
    tutorialCompleted?: boolean
    tutorialPath?: string | null
    createdAt?: Date | string
    lobbiesCreated?: LobbyUncheckedCreateNestedManyWithoutCreatorInput
    lobbiesJoined?: LobbyUncheckedCreateNestedManyWithoutJoinerInput
    lobbiesReserved?: LobbyUncheckedCreateNestedManyWithoutReservedJoinerInput
    gamesAsPlayer1?: GameUncheckedCreateNestedManyWithoutPlayer1Input
    gamesAsPlayer2?: GameUncheckedCreateNestedManyWithoutPlayer2Input
    fleets?: FleetUncheckedCreateNestedManyWithoutOwnerInput
    stats?: PlayerStatsUncheckedCreateNestedOneWithoutUserInput
  }

  export type UserCreateOrConnectWithoutShipsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutShipsInput, UserUncheckedCreateWithoutShipsInput>
  }

  export type UserUpsertWithoutShipsInput = {
    update: XOR<UserUpdateWithoutShipsInput, UserUncheckedUpdateWithoutShipsInput>
    create: XOR<UserCreateWithoutShipsInput, UserUncheckedCreateWithoutShipsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutShipsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutShipsInput, UserUncheckedUpdateWithoutShipsInput>
  }

  export type UserUpdateWithoutShipsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    username?: NullableStringFieldUpdateOperationsInput | string | null
    creditBalance?: IntFieldUpdateOperationsInput | number
    purchasedShipCount?: IntFieldUpdateOperationsInput | number
    lobbiesCreatedCount?: IntFieldUpdateOperationsInput | number
    kickCount?: IntFieldUpdateOperationsInput | number
    kickTimeoutUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tutorialCompleted?: BoolFieldUpdateOperationsInput | boolean
    tutorialPath?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lobbiesCreated?: LobbyUpdateManyWithoutCreatorNestedInput
    lobbiesJoined?: LobbyUpdateManyWithoutJoinerNestedInput
    lobbiesReserved?: LobbyUpdateManyWithoutReservedJoinerNestedInput
    gamesAsPlayer1?: GameUpdateManyWithoutPlayer1NestedInput
    gamesAsPlayer2?: GameUpdateManyWithoutPlayer2NestedInput
    fleets?: FleetUpdateManyWithoutOwnerNestedInput
    stats?: PlayerStatsUpdateOneWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutShipsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    username?: NullableStringFieldUpdateOperationsInput | string | null
    creditBalance?: IntFieldUpdateOperationsInput | number
    purchasedShipCount?: IntFieldUpdateOperationsInput | number
    lobbiesCreatedCount?: IntFieldUpdateOperationsInput | number
    kickCount?: IntFieldUpdateOperationsInput | number
    kickTimeoutUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tutorialCompleted?: BoolFieldUpdateOperationsInput | boolean
    tutorialPath?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lobbiesCreated?: LobbyUncheckedUpdateManyWithoutCreatorNestedInput
    lobbiesJoined?: LobbyUncheckedUpdateManyWithoutJoinerNestedInput
    lobbiesReserved?: LobbyUncheckedUpdateManyWithoutReservedJoinerNestedInput
    gamesAsPlayer1?: GameUncheckedUpdateManyWithoutPlayer1NestedInput
    gamesAsPlayer2?: GameUncheckedUpdateManyWithoutPlayer2NestedInput
    fleets?: FleetUncheckedUpdateManyWithoutOwnerNestedInput
    stats?: PlayerStatsUncheckedUpdateOneWithoutUserNestedInput
  }

  export type UserCreateWithoutFleetsInput = {
    id: string
    email: string
    username?: string | null
    creditBalance?: number
    purchasedShipCount?: number
    lobbiesCreatedCount?: number
    kickCount?: number
    kickTimeoutUntil?: Date | string | null
    tutorialCompleted?: boolean
    tutorialPath?: string | null
    createdAt?: Date | string
    ships?: ShipCreateNestedManyWithoutOwnerInput
    lobbiesCreated?: LobbyCreateNestedManyWithoutCreatorInput
    lobbiesJoined?: LobbyCreateNestedManyWithoutJoinerInput
    lobbiesReserved?: LobbyCreateNestedManyWithoutReservedJoinerInput
    gamesAsPlayer1?: GameCreateNestedManyWithoutPlayer1Input
    gamesAsPlayer2?: GameCreateNestedManyWithoutPlayer2Input
    stats?: PlayerStatsCreateNestedOneWithoutUserInput
  }

  export type UserUncheckedCreateWithoutFleetsInput = {
    id: string
    email: string
    username?: string | null
    creditBalance?: number
    purchasedShipCount?: number
    lobbiesCreatedCount?: number
    kickCount?: number
    kickTimeoutUntil?: Date | string | null
    tutorialCompleted?: boolean
    tutorialPath?: string | null
    createdAt?: Date | string
    ships?: ShipUncheckedCreateNestedManyWithoutOwnerInput
    lobbiesCreated?: LobbyUncheckedCreateNestedManyWithoutCreatorInput
    lobbiesJoined?: LobbyUncheckedCreateNestedManyWithoutJoinerInput
    lobbiesReserved?: LobbyUncheckedCreateNestedManyWithoutReservedJoinerInput
    gamesAsPlayer1?: GameUncheckedCreateNestedManyWithoutPlayer1Input
    gamesAsPlayer2?: GameUncheckedCreateNestedManyWithoutPlayer2Input
    stats?: PlayerStatsUncheckedCreateNestedOneWithoutUserInput
  }

  export type UserCreateOrConnectWithoutFleetsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutFleetsInput, UserUncheckedCreateWithoutFleetsInput>
  }

  export type LobbyCreateWithoutFleetsInput = {
    status?: $Enums.LobbyStatus
    costLimit?: number
    turnTimeSeconds?: number
    maxScore?: number
    creatorGoesFirst?: boolean | null
    isAiGame?: boolean
    aiDifficulty?: string | null
    createdAt?: Date | string
    joinedAt?: Date | string | null
    joinerFleetSetAt?: Date | string | null
    creator: UserCreateNestedOneWithoutLobbiesCreatedInput
    joiner?: UserCreateNestedOneWithoutLobbiesJoinedInput
    reservedJoiner?: UserCreateNestedOneWithoutLobbiesReservedInput
    map?: MapCreateNestedOneWithoutLobbiesInput
    game?: GameCreateNestedOneWithoutLobbyInput
  }

  export type LobbyUncheckedCreateWithoutFleetsInput = {
    id?: number
    creatorId: string
    joinerId?: string | null
    reservedJoinerId?: string | null
    mapId?: number | null
    status?: $Enums.LobbyStatus
    costLimit?: number
    turnTimeSeconds?: number
    maxScore?: number
    creatorGoesFirst?: boolean | null
    isAiGame?: boolean
    aiDifficulty?: string | null
    createdAt?: Date | string
    joinedAt?: Date | string | null
    joinerFleetSetAt?: Date | string | null
    game?: GameUncheckedCreateNestedOneWithoutLobbyInput
  }

  export type LobbyCreateOrConnectWithoutFleetsInput = {
    where: LobbyWhereUniqueInput
    create: XOR<LobbyCreateWithoutFleetsInput, LobbyUncheckedCreateWithoutFleetsInput>
  }

  export type UserUpsertWithoutFleetsInput = {
    update: XOR<UserUpdateWithoutFleetsInput, UserUncheckedUpdateWithoutFleetsInput>
    create: XOR<UserCreateWithoutFleetsInput, UserUncheckedCreateWithoutFleetsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutFleetsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutFleetsInput, UserUncheckedUpdateWithoutFleetsInput>
  }

  export type UserUpdateWithoutFleetsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    username?: NullableStringFieldUpdateOperationsInput | string | null
    creditBalance?: IntFieldUpdateOperationsInput | number
    purchasedShipCount?: IntFieldUpdateOperationsInput | number
    lobbiesCreatedCount?: IntFieldUpdateOperationsInput | number
    kickCount?: IntFieldUpdateOperationsInput | number
    kickTimeoutUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tutorialCompleted?: BoolFieldUpdateOperationsInput | boolean
    tutorialPath?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ships?: ShipUpdateManyWithoutOwnerNestedInput
    lobbiesCreated?: LobbyUpdateManyWithoutCreatorNestedInput
    lobbiesJoined?: LobbyUpdateManyWithoutJoinerNestedInput
    lobbiesReserved?: LobbyUpdateManyWithoutReservedJoinerNestedInput
    gamesAsPlayer1?: GameUpdateManyWithoutPlayer1NestedInput
    gamesAsPlayer2?: GameUpdateManyWithoutPlayer2NestedInput
    stats?: PlayerStatsUpdateOneWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutFleetsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    username?: NullableStringFieldUpdateOperationsInput | string | null
    creditBalance?: IntFieldUpdateOperationsInput | number
    purchasedShipCount?: IntFieldUpdateOperationsInput | number
    lobbiesCreatedCount?: IntFieldUpdateOperationsInput | number
    kickCount?: IntFieldUpdateOperationsInput | number
    kickTimeoutUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tutorialCompleted?: BoolFieldUpdateOperationsInput | boolean
    tutorialPath?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ships?: ShipUncheckedUpdateManyWithoutOwnerNestedInput
    lobbiesCreated?: LobbyUncheckedUpdateManyWithoutCreatorNestedInput
    lobbiesJoined?: LobbyUncheckedUpdateManyWithoutJoinerNestedInput
    lobbiesReserved?: LobbyUncheckedUpdateManyWithoutReservedJoinerNestedInput
    gamesAsPlayer1?: GameUncheckedUpdateManyWithoutPlayer1NestedInput
    gamesAsPlayer2?: GameUncheckedUpdateManyWithoutPlayer2NestedInput
    stats?: PlayerStatsUncheckedUpdateOneWithoutUserNestedInput
  }

  export type LobbyUpsertWithoutFleetsInput = {
    update: XOR<LobbyUpdateWithoutFleetsInput, LobbyUncheckedUpdateWithoutFleetsInput>
    create: XOR<LobbyCreateWithoutFleetsInput, LobbyUncheckedCreateWithoutFleetsInput>
    where?: LobbyWhereInput
  }

  export type LobbyUpdateToOneWithWhereWithoutFleetsInput = {
    where?: LobbyWhereInput
    data: XOR<LobbyUpdateWithoutFleetsInput, LobbyUncheckedUpdateWithoutFleetsInput>
  }

  export type LobbyUpdateWithoutFleetsInput = {
    status?: EnumLobbyStatusFieldUpdateOperationsInput | $Enums.LobbyStatus
    costLimit?: IntFieldUpdateOperationsInput | number
    turnTimeSeconds?: IntFieldUpdateOperationsInput | number
    maxScore?: IntFieldUpdateOperationsInput | number
    creatorGoesFirst?: NullableBoolFieldUpdateOperationsInput | boolean | null
    isAiGame?: BoolFieldUpdateOperationsInput | boolean
    aiDifficulty?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    joinedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    joinerFleetSetAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creator?: UserUpdateOneRequiredWithoutLobbiesCreatedNestedInput
    joiner?: UserUpdateOneWithoutLobbiesJoinedNestedInput
    reservedJoiner?: UserUpdateOneWithoutLobbiesReservedNestedInput
    map?: MapUpdateOneWithoutLobbiesNestedInput
    game?: GameUpdateOneWithoutLobbyNestedInput
  }

  export type LobbyUncheckedUpdateWithoutFleetsInput = {
    id?: IntFieldUpdateOperationsInput | number
    creatorId?: StringFieldUpdateOperationsInput | string
    joinerId?: NullableStringFieldUpdateOperationsInput | string | null
    reservedJoinerId?: NullableStringFieldUpdateOperationsInput | string | null
    mapId?: NullableIntFieldUpdateOperationsInput | number | null
    status?: EnumLobbyStatusFieldUpdateOperationsInput | $Enums.LobbyStatus
    costLimit?: IntFieldUpdateOperationsInput | number
    turnTimeSeconds?: IntFieldUpdateOperationsInput | number
    maxScore?: IntFieldUpdateOperationsInput | number
    creatorGoesFirst?: NullableBoolFieldUpdateOperationsInput | boolean | null
    isAiGame?: BoolFieldUpdateOperationsInput | boolean
    aiDifficulty?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    joinedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    joinerFleetSetAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    game?: GameUncheckedUpdateOneWithoutLobbyNestedInput
  }

  export type UserCreateWithoutLobbiesCreatedInput = {
    id: string
    email: string
    username?: string | null
    creditBalance?: number
    purchasedShipCount?: number
    lobbiesCreatedCount?: number
    kickCount?: number
    kickTimeoutUntil?: Date | string | null
    tutorialCompleted?: boolean
    tutorialPath?: string | null
    createdAt?: Date | string
    ships?: ShipCreateNestedManyWithoutOwnerInput
    lobbiesJoined?: LobbyCreateNestedManyWithoutJoinerInput
    lobbiesReserved?: LobbyCreateNestedManyWithoutReservedJoinerInput
    gamesAsPlayer1?: GameCreateNestedManyWithoutPlayer1Input
    gamesAsPlayer2?: GameCreateNestedManyWithoutPlayer2Input
    fleets?: FleetCreateNestedManyWithoutOwnerInput
    stats?: PlayerStatsCreateNestedOneWithoutUserInput
  }

  export type UserUncheckedCreateWithoutLobbiesCreatedInput = {
    id: string
    email: string
    username?: string | null
    creditBalance?: number
    purchasedShipCount?: number
    lobbiesCreatedCount?: number
    kickCount?: number
    kickTimeoutUntil?: Date | string | null
    tutorialCompleted?: boolean
    tutorialPath?: string | null
    createdAt?: Date | string
    ships?: ShipUncheckedCreateNestedManyWithoutOwnerInput
    lobbiesJoined?: LobbyUncheckedCreateNestedManyWithoutJoinerInput
    lobbiesReserved?: LobbyUncheckedCreateNestedManyWithoutReservedJoinerInput
    gamesAsPlayer1?: GameUncheckedCreateNestedManyWithoutPlayer1Input
    gamesAsPlayer2?: GameUncheckedCreateNestedManyWithoutPlayer2Input
    fleets?: FleetUncheckedCreateNestedManyWithoutOwnerInput
    stats?: PlayerStatsUncheckedCreateNestedOneWithoutUserInput
  }

  export type UserCreateOrConnectWithoutLobbiesCreatedInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutLobbiesCreatedInput, UserUncheckedCreateWithoutLobbiesCreatedInput>
  }

  export type UserCreateWithoutLobbiesJoinedInput = {
    id: string
    email: string
    username?: string | null
    creditBalance?: number
    purchasedShipCount?: number
    lobbiesCreatedCount?: number
    kickCount?: number
    kickTimeoutUntil?: Date | string | null
    tutorialCompleted?: boolean
    tutorialPath?: string | null
    createdAt?: Date | string
    ships?: ShipCreateNestedManyWithoutOwnerInput
    lobbiesCreated?: LobbyCreateNestedManyWithoutCreatorInput
    lobbiesReserved?: LobbyCreateNestedManyWithoutReservedJoinerInput
    gamesAsPlayer1?: GameCreateNestedManyWithoutPlayer1Input
    gamesAsPlayer2?: GameCreateNestedManyWithoutPlayer2Input
    fleets?: FleetCreateNestedManyWithoutOwnerInput
    stats?: PlayerStatsCreateNestedOneWithoutUserInput
  }

  export type UserUncheckedCreateWithoutLobbiesJoinedInput = {
    id: string
    email: string
    username?: string | null
    creditBalance?: number
    purchasedShipCount?: number
    lobbiesCreatedCount?: number
    kickCount?: number
    kickTimeoutUntil?: Date | string | null
    tutorialCompleted?: boolean
    tutorialPath?: string | null
    createdAt?: Date | string
    ships?: ShipUncheckedCreateNestedManyWithoutOwnerInput
    lobbiesCreated?: LobbyUncheckedCreateNestedManyWithoutCreatorInput
    lobbiesReserved?: LobbyUncheckedCreateNestedManyWithoutReservedJoinerInput
    gamesAsPlayer1?: GameUncheckedCreateNestedManyWithoutPlayer1Input
    gamesAsPlayer2?: GameUncheckedCreateNestedManyWithoutPlayer2Input
    fleets?: FleetUncheckedCreateNestedManyWithoutOwnerInput
    stats?: PlayerStatsUncheckedCreateNestedOneWithoutUserInput
  }

  export type UserCreateOrConnectWithoutLobbiesJoinedInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutLobbiesJoinedInput, UserUncheckedCreateWithoutLobbiesJoinedInput>
  }

  export type UserCreateWithoutLobbiesReservedInput = {
    id: string
    email: string
    username?: string | null
    creditBalance?: number
    purchasedShipCount?: number
    lobbiesCreatedCount?: number
    kickCount?: number
    kickTimeoutUntil?: Date | string | null
    tutorialCompleted?: boolean
    tutorialPath?: string | null
    createdAt?: Date | string
    ships?: ShipCreateNestedManyWithoutOwnerInput
    lobbiesCreated?: LobbyCreateNestedManyWithoutCreatorInput
    lobbiesJoined?: LobbyCreateNestedManyWithoutJoinerInput
    gamesAsPlayer1?: GameCreateNestedManyWithoutPlayer1Input
    gamesAsPlayer2?: GameCreateNestedManyWithoutPlayer2Input
    fleets?: FleetCreateNestedManyWithoutOwnerInput
    stats?: PlayerStatsCreateNestedOneWithoutUserInput
  }

  export type UserUncheckedCreateWithoutLobbiesReservedInput = {
    id: string
    email: string
    username?: string | null
    creditBalance?: number
    purchasedShipCount?: number
    lobbiesCreatedCount?: number
    kickCount?: number
    kickTimeoutUntil?: Date | string | null
    tutorialCompleted?: boolean
    tutorialPath?: string | null
    createdAt?: Date | string
    ships?: ShipUncheckedCreateNestedManyWithoutOwnerInput
    lobbiesCreated?: LobbyUncheckedCreateNestedManyWithoutCreatorInput
    lobbiesJoined?: LobbyUncheckedCreateNestedManyWithoutJoinerInput
    gamesAsPlayer1?: GameUncheckedCreateNestedManyWithoutPlayer1Input
    gamesAsPlayer2?: GameUncheckedCreateNestedManyWithoutPlayer2Input
    fleets?: FleetUncheckedCreateNestedManyWithoutOwnerInput
    stats?: PlayerStatsUncheckedCreateNestedOneWithoutUserInput
  }

  export type UserCreateOrConnectWithoutLobbiesReservedInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutLobbiesReservedInput, UserUncheckedCreateWithoutLobbiesReservedInput>
  }

  export type MapCreateWithoutLobbiesInput = {
    name: string
    gridWidth?: number
    gridHeight?: number
    blockedTiles?: JsonNullValueInput | InputJsonValue
    scoringTiles?: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type MapUncheckedCreateWithoutLobbiesInput = {
    id?: number
    name: string
    gridWidth?: number
    gridHeight?: number
    blockedTiles?: JsonNullValueInput | InputJsonValue
    scoringTiles?: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type MapCreateOrConnectWithoutLobbiesInput = {
    where: MapWhereUniqueInput
    create: XOR<MapCreateWithoutLobbiesInput, MapUncheckedCreateWithoutLobbiesInput>
  }

  export type FleetCreateWithoutLobbyInput = {
    shipIds?: FleetCreateshipIdsInput | number[]
    totalCost?: number
    isComplete?: boolean
    startingPositions?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    owner: UserCreateNestedOneWithoutFleetsInput
  }

  export type FleetUncheckedCreateWithoutLobbyInput = {
    id?: number
    ownerId: string
    shipIds?: FleetCreateshipIdsInput | number[]
    totalCost?: number
    isComplete?: boolean
    startingPositions?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type FleetCreateOrConnectWithoutLobbyInput = {
    where: FleetWhereUniqueInput
    create: XOR<FleetCreateWithoutLobbyInput, FleetUncheckedCreateWithoutLobbyInput>
  }

  export type FleetCreateManyLobbyInputEnvelope = {
    data: FleetCreateManyLobbyInput | FleetCreateManyLobbyInput[]
    skipDuplicates?: boolean
  }

  export type GameCreateWithoutLobbyInput = {
    state: JsonNullValueInput | InputJsonValue
    initialState?: NullableJsonNullValueInput | InputJsonValue
    currentTurn: string
    currentRound?: number
    phase?: $Enums.GamePhase
    winnerId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    player1: UserCreateNestedOneWithoutGamesAsPlayer1Input
    player2: UserCreateNestedOneWithoutGamesAsPlayer2Input
    turns?: GameTurnCreateNestedManyWithoutGameInput
  }

  export type GameUncheckedCreateWithoutLobbyInput = {
    id?: number
    player1Id: string
    player2Id: string
    state: JsonNullValueInput | InputJsonValue
    initialState?: NullableJsonNullValueInput | InputJsonValue
    currentTurn: string
    currentRound?: number
    phase?: $Enums.GamePhase
    winnerId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    turns?: GameTurnUncheckedCreateNestedManyWithoutGameInput
  }

  export type GameCreateOrConnectWithoutLobbyInput = {
    where: GameWhereUniqueInput
    create: XOR<GameCreateWithoutLobbyInput, GameUncheckedCreateWithoutLobbyInput>
  }

  export type UserUpsertWithoutLobbiesCreatedInput = {
    update: XOR<UserUpdateWithoutLobbiesCreatedInput, UserUncheckedUpdateWithoutLobbiesCreatedInput>
    create: XOR<UserCreateWithoutLobbiesCreatedInput, UserUncheckedCreateWithoutLobbiesCreatedInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutLobbiesCreatedInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutLobbiesCreatedInput, UserUncheckedUpdateWithoutLobbiesCreatedInput>
  }

  export type UserUpdateWithoutLobbiesCreatedInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    username?: NullableStringFieldUpdateOperationsInput | string | null
    creditBalance?: IntFieldUpdateOperationsInput | number
    purchasedShipCount?: IntFieldUpdateOperationsInput | number
    lobbiesCreatedCount?: IntFieldUpdateOperationsInput | number
    kickCount?: IntFieldUpdateOperationsInput | number
    kickTimeoutUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tutorialCompleted?: BoolFieldUpdateOperationsInput | boolean
    tutorialPath?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ships?: ShipUpdateManyWithoutOwnerNestedInput
    lobbiesJoined?: LobbyUpdateManyWithoutJoinerNestedInput
    lobbiesReserved?: LobbyUpdateManyWithoutReservedJoinerNestedInput
    gamesAsPlayer1?: GameUpdateManyWithoutPlayer1NestedInput
    gamesAsPlayer2?: GameUpdateManyWithoutPlayer2NestedInput
    fleets?: FleetUpdateManyWithoutOwnerNestedInput
    stats?: PlayerStatsUpdateOneWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutLobbiesCreatedInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    username?: NullableStringFieldUpdateOperationsInput | string | null
    creditBalance?: IntFieldUpdateOperationsInput | number
    purchasedShipCount?: IntFieldUpdateOperationsInput | number
    lobbiesCreatedCount?: IntFieldUpdateOperationsInput | number
    kickCount?: IntFieldUpdateOperationsInput | number
    kickTimeoutUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tutorialCompleted?: BoolFieldUpdateOperationsInput | boolean
    tutorialPath?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ships?: ShipUncheckedUpdateManyWithoutOwnerNestedInput
    lobbiesJoined?: LobbyUncheckedUpdateManyWithoutJoinerNestedInput
    lobbiesReserved?: LobbyUncheckedUpdateManyWithoutReservedJoinerNestedInput
    gamesAsPlayer1?: GameUncheckedUpdateManyWithoutPlayer1NestedInput
    gamesAsPlayer2?: GameUncheckedUpdateManyWithoutPlayer2NestedInput
    fleets?: FleetUncheckedUpdateManyWithoutOwnerNestedInput
    stats?: PlayerStatsUncheckedUpdateOneWithoutUserNestedInput
  }

  export type UserUpsertWithoutLobbiesJoinedInput = {
    update: XOR<UserUpdateWithoutLobbiesJoinedInput, UserUncheckedUpdateWithoutLobbiesJoinedInput>
    create: XOR<UserCreateWithoutLobbiesJoinedInput, UserUncheckedCreateWithoutLobbiesJoinedInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutLobbiesJoinedInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutLobbiesJoinedInput, UserUncheckedUpdateWithoutLobbiesJoinedInput>
  }

  export type UserUpdateWithoutLobbiesJoinedInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    username?: NullableStringFieldUpdateOperationsInput | string | null
    creditBalance?: IntFieldUpdateOperationsInput | number
    purchasedShipCount?: IntFieldUpdateOperationsInput | number
    lobbiesCreatedCount?: IntFieldUpdateOperationsInput | number
    kickCount?: IntFieldUpdateOperationsInput | number
    kickTimeoutUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tutorialCompleted?: BoolFieldUpdateOperationsInput | boolean
    tutorialPath?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ships?: ShipUpdateManyWithoutOwnerNestedInput
    lobbiesCreated?: LobbyUpdateManyWithoutCreatorNestedInput
    lobbiesReserved?: LobbyUpdateManyWithoutReservedJoinerNestedInput
    gamesAsPlayer1?: GameUpdateManyWithoutPlayer1NestedInput
    gamesAsPlayer2?: GameUpdateManyWithoutPlayer2NestedInput
    fleets?: FleetUpdateManyWithoutOwnerNestedInput
    stats?: PlayerStatsUpdateOneWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutLobbiesJoinedInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    username?: NullableStringFieldUpdateOperationsInput | string | null
    creditBalance?: IntFieldUpdateOperationsInput | number
    purchasedShipCount?: IntFieldUpdateOperationsInput | number
    lobbiesCreatedCount?: IntFieldUpdateOperationsInput | number
    kickCount?: IntFieldUpdateOperationsInput | number
    kickTimeoutUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tutorialCompleted?: BoolFieldUpdateOperationsInput | boolean
    tutorialPath?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ships?: ShipUncheckedUpdateManyWithoutOwnerNestedInput
    lobbiesCreated?: LobbyUncheckedUpdateManyWithoutCreatorNestedInput
    lobbiesReserved?: LobbyUncheckedUpdateManyWithoutReservedJoinerNestedInput
    gamesAsPlayer1?: GameUncheckedUpdateManyWithoutPlayer1NestedInput
    gamesAsPlayer2?: GameUncheckedUpdateManyWithoutPlayer2NestedInput
    fleets?: FleetUncheckedUpdateManyWithoutOwnerNestedInput
    stats?: PlayerStatsUncheckedUpdateOneWithoutUserNestedInput
  }

  export type UserUpsertWithoutLobbiesReservedInput = {
    update: XOR<UserUpdateWithoutLobbiesReservedInput, UserUncheckedUpdateWithoutLobbiesReservedInput>
    create: XOR<UserCreateWithoutLobbiesReservedInput, UserUncheckedCreateWithoutLobbiesReservedInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutLobbiesReservedInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutLobbiesReservedInput, UserUncheckedUpdateWithoutLobbiesReservedInput>
  }

  export type UserUpdateWithoutLobbiesReservedInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    username?: NullableStringFieldUpdateOperationsInput | string | null
    creditBalance?: IntFieldUpdateOperationsInput | number
    purchasedShipCount?: IntFieldUpdateOperationsInput | number
    lobbiesCreatedCount?: IntFieldUpdateOperationsInput | number
    kickCount?: IntFieldUpdateOperationsInput | number
    kickTimeoutUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tutorialCompleted?: BoolFieldUpdateOperationsInput | boolean
    tutorialPath?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ships?: ShipUpdateManyWithoutOwnerNestedInput
    lobbiesCreated?: LobbyUpdateManyWithoutCreatorNestedInput
    lobbiesJoined?: LobbyUpdateManyWithoutJoinerNestedInput
    gamesAsPlayer1?: GameUpdateManyWithoutPlayer1NestedInput
    gamesAsPlayer2?: GameUpdateManyWithoutPlayer2NestedInput
    fleets?: FleetUpdateManyWithoutOwnerNestedInput
    stats?: PlayerStatsUpdateOneWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutLobbiesReservedInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    username?: NullableStringFieldUpdateOperationsInput | string | null
    creditBalance?: IntFieldUpdateOperationsInput | number
    purchasedShipCount?: IntFieldUpdateOperationsInput | number
    lobbiesCreatedCount?: IntFieldUpdateOperationsInput | number
    kickCount?: IntFieldUpdateOperationsInput | number
    kickTimeoutUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tutorialCompleted?: BoolFieldUpdateOperationsInput | boolean
    tutorialPath?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ships?: ShipUncheckedUpdateManyWithoutOwnerNestedInput
    lobbiesCreated?: LobbyUncheckedUpdateManyWithoutCreatorNestedInput
    lobbiesJoined?: LobbyUncheckedUpdateManyWithoutJoinerNestedInput
    gamesAsPlayer1?: GameUncheckedUpdateManyWithoutPlayer1NestedInput
    gamesAsPlayer2?: GameUncheckedUpdateManyWithoutPlayer2NestedInput
    fleets?: FleetUncheckedUpdateManyWithoutOwnerNestedInput
    stats?: PlayerStatsUncheckedUpdateOneWithoutUserNestedInput
  }

  export type MapUpsertWithoutLobbiesInput = {
    update: XOR<MapUpdateWithoutLobbiesInput, MapUncheckedUpdateWithoutLobbiesInput>
    create: XOR<MapCreateWithoutLobbiesInput, MapUncheckedCreateWithoutLobbiesInput>
    where?: MapWhereInput
  }

  export type MapUpdateToOneWithWhereWithoutLobbiesInput = {
    where?: MapWhereInput
    data: XOR<MapUpdateWithoutLobbiesInput, MapUncheckedUpdateWithoutLobbiesInput>
  }

  export type MapUpdateWithoutLobbiesInput = {
    name?: StringFieldUpdateOperationsInput | string
    gridWidth?: IntFieldUpdateOperationsInput | number
    gridHeight?: IntFieldUpdateOperationsInput | number
    blockedTiles?: JsonNullValueInput | InputJsonValue
    scoringTiles?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MapUncheckedUpdateWithoutLobbiesInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    gridWidth?: IntFieldUpdateOperationsInput | number
    gridHeight?: IntFieldUpdateOperationsInput | number
    blockedTiles?: JsonNullValueInput | InputJsonValue
    scoringTiles?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FleetUpsertWithWhereUniqueWithoutLobbyInput = {
    where: FleetWhereUniqueInput
    update: XOR<FleetUpdateWithoutLobbyInput, FleetUncheckedUpdateWithoutLobbyInput>
    create: XOR<FleetCreateWithoutLobbyInput, FleetUncheckedCreateWithoutLobbyInput>
  }

  export type FleetUpdateWithWhereUniqueWithoutLobbyInput = {
    where: FleetWhereUniqueInput
    data: XOR<FleetUpdateWithoutLobbyInput, FleetUncheckedUpdateWithoutLobbyInput>
  }

  export type FleetUpdateManyWithWhereWithoutLobbyInput = {
    where: FleetScalarWhereInput
    data: XOR<FleetUpdateManyMutationInput, FleetUncheckedUpdateManyWithoutLobbyInput>
  }

  export type GameUpsertWithoutLobbyInput = {
    update: XOR<GameUpdateWithoutLobbyInput, GameUncheckedUpdateWithoutLobbyInput>
    create: XOR<GameCreateWithoutLobbyInput, GameUncheckedCreateWithoutLobbyInput>
    where?: GameWhereInput
  }

  export type GameUpdateToOneWithWhereWithoutLobbyInput = {
    where?: GameWhereInput
    data: XOR<GameUpdateWithoutLobbyInput, GameUncheckedUpdateWithoutLobbyInput>
  }

  export type GameUpdateWithoutLobbyInput = {
    state?: JsonNullValueInput | InputJsonValue
    initialState?: NullableJsonNullValueInput | InputJsonValue
    currentTurn?: StringFieldUpdateOperationsInput | string
    currentRound?: IntFieldUpdateOperationsInput | number
    phase?: EnumGamePhaseFieldUpdateOperationsInput | $Enums.GamePhase
    winnerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    player1?: UserUpdateOneRequiredWithoutGamesAsPlayer1NestedInput
    player2?: UserUpdateOneRequiredWithoutGamesAsPlayer2NestedInput
    turns?: GameTurnUpdateManyWithoutGameNestedInput
  }

  export type GameUncheckedUpdateWithoutLobbyInput = {
    id?: IntFieldUpdateOperationsInput | number
    player1Id?: StringFieldUpdateOperationsInput | string
    player2Id?: StringFieldUpdateOperationsInput | string
    state?: JsonNullValueInput | InputJsonValue
    initialState?: NullableJsonNullValueInput | InputJsonValue
    currentTurn?: StringFieldUpdateOperationsInput | string
    currentRound?: IntFieldUpdateOperationsInput | number
    phase?: EnumGamePhaseFieldUpdateOperationsInput | $Enums.GamePhase
    winnerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    turns?: GameTurnUncheckedUpdateManyWithoutGameNestedInput
  }

  export type LobbyCreateWithoutGameInput = {
    status?: $Enums.LobbyStatus
    costLimit?: number
    turnTimeSeconds?: number
    maxScore?: number
    creatorGoesFirst?: boolean | null
    isAiGame?: boolean
    aiDifficulty?: string | null
    createdAt?: Date | string
    joinedAt?: Date | string | null
    joinerFleetSetAt?: Date | string | null
    creator: UserCreateNestedOneWithoutLobbiesCreatedInput
    joiner?: UserCreateNestedOneWithoutLobbiesJoinedInput
    reservedJoiner?: UserCreateNestedOneWithoutLobbiesReservedInput
    map?: MapCreateNestedOneWithoutLobbiesInput
    fleets?: FleetCreateNestedManyWithoutLobbyInput
  }

  export type LobbyUncheckedCreateWithoutGameInput = {
    id?: number
    creatorId: string
    joinerId?: string | null
    reservedJoinerId?: string | null
    mapId?: number | null
    status?: $Enums.LobbyStatus
    costLimit?: number
    turnTimeSeconds?: number
    maxScore?: number
    creatorGoesFirst?: boolean | null
    isAiGame?: boolean
    aiDifficulty?: string | null
    createdAt?: Date | string
    joinedAt?: Date | string | null
    joinerFleetSetAt?: Date | string | null
    fleets?: FleetUncheckedCreateNestedManyWithoutLobbyInput
  }

  export type LobbyCreateOrConnectWithoutGameInput = {
    where: LobbyWhereUniqueInput
    create: XOR<LobbyCreateWithoutGameInput, LobbyUncheckedCreateWithoutGameInput>
  }

  export type UserCreateWithoutGamesAsPlayer1Input = {
    id: string
    email: string
    username?: string | null
    creditBalance?: number
    purchasedShipCount?: number
    lobbiesCreatedCount?: number
    kickCount?: number
    kickTimeoutUntil?: Date | string | null
    tutorialCompleted?: boolean
    tutorialPath?: string | null
    createdAt?: Date | string
    ships?: ShipCreateNestedManyWithoutOwnerInput
    lobbiesCreated?: LobbyCreateNestedManyWithoutCreatorInput
    lobbiesJoined?: LobbyCreateNestedManyWithoutJoinerInput
    lobbiesReserved?: LobbyCreateNestedManyWithoutReservedJoinerInput
    gamesAsPlayer2?: GameCreateNestedManyWithoutPlayer2Input
    fleets?: FleetCreateNestedManyWithoutOwnerInput
    stats?: PlayerStatsCreateNestedOneWithoutUserInput
  }

  export type UserUncheckedCreateWithoutGamesAsPlayer1Input = {
    id: string
    email: string
    username?: string | null
    creditBalance?: number
    purchasedShipCount?: number
    lobbiesCreatedCount?: number
    kickCount?: number
    kickTimeoutUntil?: Date | string | null
    tutorialCompleted?: boolean
    tutorialPath?: string | null
    createdAt?: Date | string
    ships?: ShipUncheckedCreateNestedManyWithoutOwnerInput
    lobbiesCreated?: LobbyUncheckedCreateNestedManyWithoutCreatorInput
    lobbiesJoined?: LobbyUncheckedCreateNestedManyWithoutJoinerInput
    lobbiesReserved?: LobbyUncheckedCreateNestedManyWithoutReservedJoinerInput
    gamesAsPlayer2?: GameUncheckedCreateNestedManyWithoutPlayer2Input
    fleets?: FleetUncheckedCreateNestedManyWithoutOwnerInput
    stats?: PlayerStatsUncheckedCreateNestedOneWithoutUserInput
  }

  export type UserCreateOrConnectWithoutGamesAsPlayer1Input = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutGamesAsPlayer1Input, UserUncheckedCreateWithoutGamesAsPlayer1Input>
  }

  export type UserCreateWithoutGamesAsPlayer2Input = {
    id: string
    email: string
    username?: string | null
    creditBalance?: number
    purchasedShipCount?: number
    lobbiesCreatedCount?: number
    kickCount?: number
    kickTimeoutUntil?: Date | string | null
    tutorialCompleted?: boolean
    tutorialPath?: string | null
    createdAt?: Date | string
    ships?: ShipCreateNestedManyWithoutOwnerInput
    lobbiesCreated?: LobbyCreateNestedManyWithoutCreatorInput
    lobbiesJoined?: LobbyCreateNestedManyWithoutJoinerInput
    lobbiesReserved?: LobbyCreateNestedManyWithoutReservedJoinerInput
    gamesAsPlayer1?: GameCreateNestedManyWithoutPlayer1Input
    fleets?: FleetCreateNestedManyWithoutOwnerInput
    stats?: PlayerStatsCreateNestedOneWithoutUserInput
  }

  export type UserUncheckedCreateWithoutGamesAsPlayer2Input = {
    id: string
    email: string
    username?: string | null
    creditBalance?: number
    purchasedShipCount?: number
    lobbiesCreatedCount?: number
    kickCount?: number
    kickTimeoutUntil?: Date | string | null
    tutorialCompleted?: boolean
    tutorialPath?: string | null
    createdAt?: Date | string
    ships?: ShipUncheckedCreateNestedManyWithoutOwnerInput
    lobbiesCreated?: LobbyUncheckedCreateNestedManyWithoutCreatorInput
    lobbiesJoined?: LobbyUncheckedCreateNestedManyWithoutJoinerInput
    lobbiesReserved?: LobbyUncheckedCreateNestedManyWithoutReservedJoinerInput
    gamesAsPlayer1?: GameUncheckedCreateNestedManyWithoutPlayer1Input
    fleets?: FleetUncheckedCreateNestedManyWithoutOwnerInput
    stats?: PlayerStatsUncheckedCreateNestedOneWithoutUserInput
  }

  export type UserCreateOrConnectWithoutGamesAsPlayer2Input = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutGamesAsPlayer2Input, UserUncheckedCreateWithoutGamesAsPlayer2Input>
  }

  export type GameTurnCreateWithoutGameInput = {
    playerId: string
    round: number
    actions: JsonNullValueInput | InputJsonValue
    snapshot?: NullableJsonNullValueInput | InputJsonValue
    submittedAt?: Date | string
  }

  export type GameTurnUncheckedCreateWithoutGameInput = {
    id?: number
    playerId: string
    round: number
    actions: JsonNullValueInput | InputJsonValue
    snapshot?: NullableJsonNullValueInput | InputJsonValue
    submittedAt?: Date | string
  }

  export type GameTurnCreateOrConnectWithoutGameInput = {
    where: GameTurnWhereUniqueInput
    create: XOR<GameTurnCreateWithoutGameInput, GameTurnUncheckedCreateWithoutGameInput>
  }

  export type GameTurnCreateManyGameInputEnvelope = {
    data: GameTurnCreateManyGameInput | GameTurnCreateManyGameInput[]
    skipDuplicates?: boolean
  }

  export type LobbyUpsertWithoutGameInput = {
    update: XOR<LobbyUpdateWithoutGameInput, LobbyUncheckedUpdateWithoutGameInput>
    create: XOR<LobbyCreateWithoutGameInput, LobbyUncheckedCreateWithoutGameInput>
    where?: LobbyWhereInput
  }

  export type LobbyUpdateToOneWithWhereWithoutGameInput = {
    where?: LobbyWhereInput
    data: XOR<LobbyUpdateWithoutGameInput, LobbyUncheckedUpdateWithoutGameInput>
  }

  export type LobbyUpdateWithoutGameInput = {
    status?: EnumLobbyStatusFieldUpdateOperationsInput | $Enums.LobbyStatus
    costLimit?: IntFieldUpdateOperationsInput | number
    turnTimeSeconds?: IntFieldUpdateOperationsInput | number
    maxScore?: IntFieldUpdateOperationsInput | number
    creatorGoesFirst?: NullableBoolFieldUpdateOperationsInput | boolean | null
    isAiGame?: BoolFieldUpdateOperationsInput | boolean
    aiDifficulty?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    joinedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    joinerFleetSetAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creator?: UserUpdateOneRequiredWithoutLobbiesCreatedNestedInput
    joiner?: UserUpdateOneWithoutLobbiesJoinedNestedInput
    reservedJoiner?: UserUpdateOneWithoutLobbiesReservedNestedInput
    map?: MapUpdateOneWithoutLobbiesNestedInput
    fleets?: FleetUpdateManyWithoutLobbyNestedInput
  }

  export type LobbyUncheckedUpdateWithoutGameInput = {
    id?: IntFieldUpdateOperationsInput | number
    creatorId?: StringFieldUpdateOperationsInput | string
    joinerId?: NullableStringFieldUpdateOperationsInput | string | null
    reservedJoinerId?: NullableStringFieldUpdateOperationsInput | string | null
    mapId?: NullableIntFieldUpdateOperationsInput | number | null
    status?: EnumLobbyStatusFieldUpdateOperationsInput | $Enums.LobbyStatus
    costLimit?: IntFieldUpdateOperationsInput | number
    turnTimeSeconds?: IntFieldUpdateOperationsInput | number
    maxScore?: IntFieldUpdateOperationsInput | number
    creatorGoesFirst?: NullableBoolFieldUpdateOperationsInput | boolean | null
    isAiGame?: BoolFieldUpdateOperationsInput | boolean
    aiDifficulty?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    joinedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    joinerFleetSetAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fleets?: FleetUncheckedUpdateManyWithoutLobbyNestedInput
  }

  export type UserUpsertWithoutGamesAsPlayer1Input = {
    update: XOR<UserUpdateWithoutGamesAsPlayer1Input, UserUncheckedUpdateWithoutGamesAsPlayer1Input>
    create: XOR<UserCreateWithoutGamesAsPlayer1Input, UserUncheckedCreateWithoutGamesAsPlayer1Input>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutGamesAsPlayer1Input = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutGamesAsPlayer1Input, UserUncheckedUpdateWithoutGamesAsPlayer1Input>
  }

  export type UserUpdateWithoutGamesAsPlayer1Input = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    username?: NullableStringFieldUpdateOperationsInput | string | null
    creditBalance?: IntFieldUpdateOperationsInput | number
    purchasedShipCount?: IntFieldUpdateOperationsInput | number
    lobbiesCreatedCount?: IntFieldUpdateOperationsInput | number
    kickCount?: IntFieldUpdateOperationsInput | number
    kickTimeoutUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tutorialCompleted?: BoolFieldUpdateOperationsInput | boolean
    tutorialPath?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ships?: ShipUpdateManyWithoutOwnerNestedInput
    lobbiesCreated?: LobbyUpdateManyWithoutCreatorNestedInput
    lobbiesJoined?: LobbyUpdateManyWithoutJoinerNestedInput
    lobbiesReserved?: LobbyUpdateManyWithoutReservedJoinerNestedInput
    gamesAsPlayer2?: GameUpdateManyWithoutPlayer2NestedInput
    fleets?: FleetUpdateManyWithoutOwnerNestedInput
    stats?: PlayerStatsUpdateOneWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutGamesAsPlayer1Input = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    username?: NullableStringFieldUpdateOperationsInput | string | null
    creditBalance?: IntFieldUpdateOperationsInput | number
    purchasedShipCount?: IntFieldUpdateOperationsInput | number
    lobbiesCreatedCount?: IntFieldUpdateOperationsInput | number
    kickCount?: IntFieldUpdateOperationsInput | number
    kickTimeoutUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tutorialCompleted?: BoolFieldUpdateOperationsInput | boolean
    tutorialPath?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ships?: ShipUncheckedUpdateManyWithoutOwnerNestedInput
    lobbiesCreated?: LobbyUncheckedUpdateManyWithoutCreatorNestedInput
    lobbiesJoined?: LobbyUncheckedUpdateManyWithoutJoinerNestedInput
    lobbiesReserved?: LobbyUncheckedUpdateManyWithoutReservedJoinerNestedInput
    gamesAsPlayer2?: GameUncheckedUpdateManyWithoutPlayer2NestedInput
    fleets?: FleetUncheckedUpdateManyWithoutOwnerNestedInput
    stats?: PlayerStatsUncheckedUpdateOneWithoutUserNestedInput
  }

  export type UserUpsertWithoutGamesAsPlayer2Input = {
    update: XOR<UserUpdateWithoutGamesAsPlayer2Input, UserUncheckedUpdateWithoutGamesAsPlayer2Input>
    create: XOR<UserCreateWithoutGamesAsPlayer2Input, UserUncheckedCreateWithoutGamesAsPlayer2Input>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutGamesAsPlayer2Input = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutGamesAsPlayer2Input, UserUncheckedUpdateWithoutGamesAsPlayer2Input>
  }

  export type UserUpdateWithoutGamesAsPlayer2Input = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    username?: NullableStringFieldUpdateOperationsInput | string | null
    creditBalance?: IntFieldUpdateOperationsInput | number
    purchasedShipCount?: IntFieldUpdateOperationsInput | number
    lobbiesCreatedCount?: IntFieldUpdateOperationsInput | number
    kickCount?: IntFieldUpdateOperationsInput | number
    kickTimeoutUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tutorialCompleted?: BoolFieldUpdateOperationsInput | boolean
    tutorialPath?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ships?: ShipUpdateManyWithoutOwnerNestedInput
    lobbiesCreated?: LobbyUpdateManyWithoutCreatorNestedInput
    lobbiesJoined?: LobbyUpdateManyWithoutJoinerNestedInput
    lobbiesReserved?: LobbyUpdateManyWithoutReservedJoinerNestedInput
    gamesAsPlayer1?: GameUpdateManyWithoutPlayer1NestedInput
    fleets?: FleetUpdateManyWithoutOwnerNestedInput
    stats?: PlayerStatsUpdateOneWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutGamesAsPlayer2Input = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    username?: NullableStringFieldUpdateOperationsInput | string | null
    creditBalance?: IntFieldUpdateOperationsInput | number
    purchasedShipCount?: IntFieldUpdateOperationsInput | number
    lobbiesCreatedCount?: IntFieldUpdateOperationsInput | number
    kickCount?: IntFieldUpdateOperationsInput | number
    kickTimeoutUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tutorialCompleted?: BoolFieldUpdateOperationsInput | boolean
    tutorialPath?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ships?: ShipUncheckedUpdateManyWithoutOwnerNestedInput
    lobbiesCreated?: LobbyUncheckedUpdateManyWithoutCreatorNestedInput
    lobbiesJoined?: LobbyUncheckedUpdateManyWithoutJoinerNestedInput
    lobbiesReserved?: LobbyUncheckedUpdateManyWithoutReservedJoinerNestedInput
    gamesAsPlayer1?: GameUncheckedUpdateManyWithoutPlayer1NestedInput
    fleets?: FleetUncheckedUpdateManyWithoutOwnerNestedInput
    stats?: PlayerStatsUncheckedUpdateOneWithoutUserNestedInput
  }

  export type GameTurnUpsertWithWhereUniqueWithoutGameInput = {
    where: GameTurnWhereUniqueInput
    update: XOR<GameTurnUpdateWithoutGameInput, GameTurnUncheckedUpdateWithoutGameInput>
    create: XOR<GameTurnCreateWithoutGameInput, GameTurnUncheckedCreateWithoutGameInput>
  }

  export type GameTurnUpdateWithWhereUniqueWithoutGameInput = {
    where: GameTurnWhereUniqueInput
    data: XOR<GameTurnUpdateWithoutGameInput, GameTurnUncheckedUpdateWithoutGameInput>
  }

  export type GameTurnUpdateManyWithWhereWithoutGameInput = {
    where: GameTurnScalarWhereInput
    data: XOR<GameTurnUpdateManyMutationInput, GameTurnUncheckedUpdateManyWithoutGameInput>
  }

  export type GameTurnScalarWhereInput = {
    AND?: GameTurnScalarWhereInput | GameTurnScalarWhereInput[]
    OR?: GameTurnScalarWhereInput[]
    NOT?: GameTurnScalarWhereInput | GameTurnScalarWhereInput[]
    id?: IntFilter<"GameTurn"> | number
    gameId?: IntFilter<"GameTurn"> | number
    playerId?: StringFilter<"GameTurn"> | string
    round?: IntFilter<"GameTurn"> | number
    actions?: JsonFilter<"GameTurn">
    snapshot?: JsonNullableFilter<"GameTurn">
    submittedAt?: DateTimeFilter<"GameTurn"> | Date | string
  }

  export type GameCreateWithoutTurnsInput = {
    state: JsonNullValueInput | InputJsonValue
    initialState?: NullableJsonNullValueInput | InputJsonValue
    currentTurn: string
    currentRound?: number
    phase?: $Enums.GamePhase
    winnerId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    lobby: LobbyCreateNestedOneWithoutGameInput
    player1: UserCreateNestedOneWithoutGamesAsPlayer1Input
    player2: UserCreateNestedOneWithoutGamesAsPlayer2Input
  }

  export type GameUncheckedCreateWithoutTurnsInput = {
    id?: number
    lobbyId: number
    player1Id: string
    player2Id: string
    state: JsonNullValueInput | InputJsonValue
    initialState?: NullableJsonNullValueInput | InputJsonValue
    currentTurn: string
    currentRound?: number
    phase?: $Enums.GamePhase
    winnerId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type GameCreateOrConnectWithoutTurnsInput = {
    where: GameWhereUniqueInput
    create: XOR<GameCreateWithoutTurnsInput, GameUncheckedCreateWithoutTurnsInput>
  }

  export type GameUpsertWithoutTurnsInput = {
    update: XOR<GameUpdateWithoutTurnsInput, GameUncheckedUpdateWithoutTurnsInput>
    create: XOR<GameCreateWithoutTurnsInput, GameUncheckedCreateWithoutTurnsInput>
    where?: GameWhereInput
  }

  export type GameUpdateToOneWithWhereWithoutTurnsInput = {
    where?: GameWhereInput
    data: XOR<GameUpdateWithoutTurnsInput, GameUncheckedUpdateWithoutTurnsInput>
  }

  export type GameUpdateWithoutTurnsInput = {
    state?: JsonNullValueInput | InputJsonValue
    initialState?: NullableJsonNullValueInput | InputJsonValue
    currentTurn?: StringFieldUpdateOperationsInput | string
    currentRound?: IntFieldUpdateOperationsInput | number
    phase?: EnumGamePhaseFieldUpdateOperationsInput | $Enums.GamePhase
    winnerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lobby?: LobbyUpdateOneRequiredWithoutGameNestedInput
    player1?: UserUpdateOneRequiredWithoutGamesAsPlayer1NestedInput
    player2?: UserUpdateOneRequiredWithoutGamesAsPlayer2NestedInput
  }

  export type GameUncheckedUpdateWithoutTurnsInput = {
    id?: IntFieldUpdateOperationsInput | number
    lobbyId?: IntFieldUpdateOperationsInput | number
    player1Id?: StringFieldUpdateOperationsInput | string
    player2Id?: StringFieldUpdateOperationsInput | string
    state?: JsonNullValueInput | InputJsonValue
    initialState?: NullableJsonNullValueInput | InputJsonValue
    currentTurn?: StringFieldUpdateOperationsInput | string
    currentRound?: IntFieldUpdateOperationsInput | number
    phase?: EnumGamePhaseFieldUpdateOperationsInput | $Enums.GamePhase
    winnerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LobbyCreateWithoutMapInput = {
    status?: $Enums.LobbyStatus
    costLimit?: number
    turnTimeSeconds?: number
    maxScore?: number
    creatorGoesFirst?: boolean | null
    isAiGame?: boolean
    aiDifficulty?: string | null
    createdAt?: Date | string
    joinedAt?: Date | string | null
    joinerFleetSetAt?: Date | string | null
    creator: UserCreateNestedOneWithoutLobbiesCreatedInput
    joiner?: UserCreateNestedOneWithoutLobbiesJoinedInput
    reservedJoiner?: UserCreateNestedOneWithoutLobbiesReservedInput
    fleets?: FleetCreateNestedManyWithoutLobbyInput
    game?: GameCreateNestedOneWithoutLobbyInput
  }

  export type LobbyUncheckedCreateWithoutMapInput = {
    id?: number
    creatorId: string
    joinerId?: string | null
    reservedJoinerId?: string | null
    status?: $Enums.LobbyStatus
    costLimit?: number
    turnTimeSeconds?: number
    maxScore?: number
    creatorGoesFirst?: boolean | null
    isAiGame?: boolean
    aiDifficulty?: string | null
    createdAt?: Date | string
    joinedAt?: Date | string | null
    joinerFleetSetAt?: Date | string | null
    fleets?: FleetUncheckedCreateNestedManyWithoutLobbyInput
    game?: GameUncheckedCreateNestedOneWithoutLobbyInput
  }

  export type LobbyCreateOrConnectWithoutMapInput = {
    where: LobbyWhereUniqueInput
    create: XOR<LobbyCreateWithoutMapInput, LobbyUncheckedCreateWithoutMapInput>
  }

  export type LobbyCreateManyMapInputEnvelope = {
    data: LobbyCreateManyMapInput | LobbyCreateManyMapInput[]
    skipDuplicates?: boolean
  }

  export type LobbyUpsertWithWhereUniqueWithoutMapInput = {
    where: LobbyWhereUniqueInput
    update: XOR<LobbyUpdateWithoutMapInput, LobbyUncheckedUpdateWithoutMapInput>
    create: XOR<LobbyCreateWithoutMapInput, LobbyUncheckedCreateWithoutMapInput>
  }

  export type LobbyUpdateWithWhereUniqueWithoutMapInput = {
    where: LobbyWhereUniqueInput
    data: XOR<LobbyUpdateWithoutMapInput, LobbyUncheckedUpdateWithoutMapInput>
  }

  export type LobbyUpdateManyWithWhereWithoutMapInput = {
    where: LobbyScalarWhereInput
    data: XOR<LobbyUpdateManyMutationInput, LobbyUncheckedUpdateManyWithoutMapInput>
  }

  export type UserCreateWithoutStatsInput = {
    id: string
    email: string
    username?: string | null
    creditBalance?: number
    purchasedShipCount?: number
    lobbiesCreatedCount?: number
    kickCount?: number
    kickTimeoutUntil?: Date | string | null
    tutorialCompleted?: boolean
    tutorialPath?: string | null
    createdAt?: Date | string
    ships?: ShipCreateNestedManyWithoutOwnerInput
    lobbiesCreated?: LobbyCreateNestedManyWithoutCreatorInput
    lobbiesJoined?: LobbyCreateNestedManyWithoutJoinerInput
    lobbiesReserved?: LobbyCreateNestedManyWithoutReservedJoinerInput
    gamesAsPlayer1?: GameCreateNestedManyWithoutPlayer1Input
    gamesAsPlayer2?: GameCreateNestedManyWithoutPlayer2Input
    fleets?: FleetCreateNestedManyWithoutOwnerInput
  }

  export type UserUncheckedCreateWithoutStatsInput = {
    id: string
    email: string
    username?: string | null
    creditBalance?: number
    purchasedShipCount?: number
    lobbiesCreatedCount?: number
    kickCount?: number
    kickTimeoutUntil?: Date | string | null
    tutorialCompleted?: boolean
    tutorialPath?: string | null
    createdAt?: Date | string
    ships?: ShipUncheckedCreateNestedManyWithoutOwnerInput
    lobbiesCreated?: LobbyUncheckedCreateNestedManyWithoutCreatorInput
    lobbiesJoined?: LobbyUncheckedCreateNestedManyWithoutJoinerInput
    lobbiesReserved?: LobbyUncheckedCreateNestedManyWithoutReservedJoinerInput
    gamesAsPlayer1?: GameUncheckedCreateNestedManyWithoutPlayer1Input
    gamesAsPlayer2?: GameUncheckedCreateNestedManyWithoutPlayer2Input
    fleets?: FleetUncheckedCreateNestedManyWithoutOwnerInput
  }

  export type UserCreateOrConnectWithoutStatsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutStatsInput, UserUncheckedCreateWithoutStatsInput>
  }

  export type UserUpsertWithoutStatsInput = {
    update: XOR<UserUpdateWithoutStatsInput, UserUncheckedUpdateWithoutStatsInput>
    create: XOR<UserCreateWithoutStatsInput, UserUncheckedCreateWithoutStatsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutStatsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutStatsInput, UserUncheckedUpdateWithoutStatsInput>
  }

  export type UserUpdateWithoutStatsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    username?: NullableStringFieldUpdateOperationsInput | string | null
    creditBalance?: IntFieldUpdateOperationsInput | number
    purchasedShipCount?: IntFieldUpdateOperationsInput | number
    lobbiesCreatedCount?: IntFieldUpdateOperationsInput | number
    kickCount?: IntFieldUpdateOperationsInput | number
    kickTimeoutUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tutorialCompleted?: BoolFieldUpdateOperationsInput | boolean
    tutorialPath?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ships?: ShipUpdateManyWithoutOwnerNestedInput
    lobbiesCreated?: LobbyUpdateManyWithoutCreatorNestedInput
    lobbiesJoined?: LobbyUpdateManyWithoutJoinerNestedInput
    lobbiesReserved?: LobbyUpdateManyWithoutReservedJoinerNestedInput
    gamesAsPlayer1?: GameUpdateManyWithoutPlayer1NestedInput
    gamesAsPlayer2?: GameUpdateManyWithoutPlayer2NestedInput
    fleets?: FleetUpdateManyWithoutOwnerNestedInput
  }

  export type UserUncheckedUpdateWithoutStatsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    username?: NullableStringFieldUpdateOperationsInput | string | null
    creditBalance?: IntFieldUpdateOperationsInput | number
    purchasedShipCount?: IntFieldUpdateOperationsInput | number
    lobbiesCreatedCount?: IntFieldUpdateOperationsInput | number
    kickCount?: IntFieldUpdateOperationsInput | number
    kickTimeoutUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tutorialCompleted?: BoolFieldUpdateOperationsInput | boolean
    tutorialPath?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ships?: ShipUncheckedUpdateManyWithoutOwnerNestedInput
    lobbiesCreated?: LobbyUncheckedUpdateManyWithoutCreatorNestedInput
    lobbiesJoined?: LobbyUncheckedUpdateManyWithoutJoinerNestedInput
    lobbiesReserved?: LobbyUncheckedUpdateManyWithoutReservedJoinerNestedInput
    gamesAsPlayer1?: GameUncheckedUpdateManyWithoutPlayer1NestedInput
    gamesAsPlayer2?: GameUncheckedUpdateManyWithoutPlayer2NestedInput
    fleets?: FleetUncheckedUpdateManyWithoutOwnerNestedInput
  }

  export type ShipCreateManyOwnerInput = {
    id?: number
    name?: string
    equipment: JsonNullValueInput | InputJsonValue
    traits: JsonNullValueInput | InputJsonValue
    cost?: number
    costsVersion?: number
    isFree?: boolean
    modifiedCount?: number
    shiny?: boolean
    constructed?: boolean
    inFleet?: boolean
    destroyed?: boolean
    shipsDestroyed?: number
    destroyedAt?: Date | string | null
    createdAt?: Date | string
  }

  export type LobbyCreateManyCreatorInput = {
    id?: number
    joinerId?: string | null
    reservedJoinerId?: string | null
    mapId?: number | null
    status?: $Enums.LobbyStatus
    costLimit?: number
    turnTimeSeconds?: number
    maxScore?: number
    creatorGoesFirst?: boolean | null
    isAiGame?: boolean
    aiDifficulty?: string | null
    createdAt?: Date | string
    joinedAt?: Date | string | null
    joinerFleetSetAt?: Date | string | null
  }

  export type LobbyCreateManyJoinerInput = {
    id?: number
    creatorId: string
    reservedJoinerId?: string | null
    mapId?: number | null
    status?: $Enums.LobbyStatus
    costLimit?: number
    turnTimeSeconds?: number
    maxScore?: number
    creatorGoesFirst?: boolean | null
    isAiGame?: boolean
    aiDifficulty?: string | null
    createdAt?: Date | string
    joinedAt?: Date | string | null
    joinerFleetSetAt?: Date | string | null
  }

  export type LobbyCreateManyReservedJoinerInput = {
    id?: number
    creatorId: string
    joinerId?: string | null
    mapId?: number | null
    status?: $Enums.LobbyStatus
    costLimit?: number
    turnTimeSeconds?: number
    maxScore?: number
    creatorGoesFirst?: boolean | null
    isAiGame?: boolean
    aiDifficulty?: string | null
    createdAt?: Date | string
    joinedAt?: Date | string | null
    joinerFleetSetAt?: Date | string | null
  }

  export type GameCreateManyPlayer1Input = {
    id?: number
    lobbyId: number
    player2Id: string
    state: JsonNullValueInput | InputJsonValue
    initialState?: NullableJsonNullValueInput | InputJsonValue
    currentTurn: string
    currentRound?: number
    phase?: $Enums.GamePhase
    winnerId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type GameCreateManyPlayer2Input = {
    id?: number
    lobbyId: number
    player1Id: string
    state: JsonNullValueInput | InputJsonValue
    initialState?: NullableJsonNullValueInput | InputJsonValue
    currentTurn: string
    currentRound?: number
    phase?: $Enums.GamePhase
    winnerId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FleetCreateManyOwnerInput = {
    id?: number
    lobbyId: number
    shipIds?: FleetCreateshipIdsInput | number[]
    totalCost?: number
    isComplete?: boolean
    startingPositions?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type ShipUpdateWithoutOwnerInput = {
    name?: StringFieldUpdateOperationsInput | string
    equipment?: JsonNullValueInput | InputJsonValue
    traits?: JsonNullValueInput | InputJsonValue
    cost?: IntFieldUpdateOperationsInput | number
    costsVersion?: IntFieldUpdateOperationsInput | number
    isFree?: BoolFieldUpdateOperationsInput | boolean
    modifiedCount?: IntFieldUpdateOperationsInput | number
    shiny?: BoolFieldUpdateOperationsInput | boolean
    constructed?: BoolFieldUpdateOperationsInput | boolean
    inFleet?: BoolFieldUpdateOperationsInput | boolean
    destroyed?: BoolFieldUpdateOperationsInput | boolean
    shipsDestroyed?: IntFieldUpdateOperationsInput | number
    destroyedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ShipUncheckedUpdateWithoutOwnerInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    equipment?: JsonNullValueInput | InputJsonValue
    traits?: JsonNullValueInput | InputJsonValue
    cost?: IntFieldUpdateOperationsInput | number
    costsVersion?: IntFieldUpdateOperationsInput | number
    isFree?: BoolFieldUpdateOperationsInput | boolean
    modifiedCount?: IntFieldUpdateOperationsInput | number
    shiny?: BoolFieldUpdateOperationsInput | boolean
    constructed?: BoolFieldUpdateOperationsInput | boolean
    inFleet?: BoolFieldUpdateOperationsInput | boolean
    destroyed?: BoolFieldUpdateOperationsInput | boolean
    shipsDestroyed?: IntFieldUpdateOperationsInput | number
    destroyedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ShipUncheckedUpdateManyWithoutOwnerInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    equipment?: JsonNullValueInput | InputJsonValue
    traits?: JsonNullValueInput | InputJsonValue
    cost?: IntFieldUpdateOperationsInput | number
    costsVersion?: IntFieldUpdateOperationsInput | number
    isFree?: BoolFieldUpdateOperationsInput | boolean
    modifiedCount?: IntFieldUpdateOperationsInput | number
    shiny?: BoolFieldUpdateOperationsInput | boolean
    constructed?: BoolFieldUpdateOperationsInput | boolean
    inFleet?: BoolFieldUpdateOperationsInput | boolean
    destroyed?: BoolFieldUpdateOperationsInput | boolean
    shipsDestroyed?: IntFieldUpdateOperationsInput | number
    destroyedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LobbyUpdateWithoutCreatorInput = {
    status?: EnumLobbyStatusFieldUpdateOperationsInput | $Enums.LobbyStatus
    costLimit?: IntFieldUpdateOperationsInput | number
    turnTimeSeconds?: IntFieldUpdateOperationsInput | number
    maxScore?: IntFieldUpdateOperationsInput | number
    creatorGoesFirst?: NullableBoolFieldUpdateOperationsInput | boolean | null
    isAiGame?: BoolFieldUpdateOperationsInput | boolean
    aiDifficulty?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    joinedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    joinerFleetSetAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    joiner?: UserUpdateOneWithoutLobbiesJoinedNestedInput
    reservedJoiner?: UserUpdateOneWithoutLobbiesReservedNestedInput
    map?: MapUpdateOneWithoutLobbiesNestedInput
    fleets?: FleetUpdateManyWithoutLobbyNestedInput
    game?: GameUpdateOneWithoutLobbyNestedInput
  }

  export type LobbyUncheckedUpdateWithoutCreatorInput = {
    id?: IntFieldUpdateOperationsInput | number
    joinerId?: NullableStringFieldUpdateOperationsInput | string | null
    reservedJoinerId?: NullableStringFieldUpdateOperationsInput | string | null
    mapId?: NullableIntFieldUpdateOperationsInput | number | null
    status?: EnumLobbyStatusFieldUpdateOperationsInput | $Enums.LobbyStatus
    costLimit?: IntFieldUpdateOperationsInput | number
    turnTimeSeconds?: IntFieldUpdateOperationsInput | number
    maxScore?: IntFieldUpdateOperationsInput | number
    creatorGoesFirst?: NullableBoolFieldUpdateOperationsInput | boolean | null
    isAiGame?: BoolFieldUpdateOperationsInput | boolean
    aiDifficulty?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    joinedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    joinerFleetSetAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fleets?: FleetUncheckedUpdateManyWithoutLobbyNestedInput
    game?: GameUncheckedUpdateOneWithoutLobbyNestedInput
  }

  export type LobbyUncheckedUpdateManyWithoutCreatorInput = {
    id?: IntFieldUpdateOperationsInput | number
    joinerId?: NullableStringFieldUpdateOperationsInput | string | null
    reservedJoinerId?: NullableStringFieldUpdateOperationsInput | string | null
    mapId?: NullableIntFieldUpdateOperationsInput | number | null
    status?: EnumLobbyStatusFieldUpdateOperationsInput | $Enums.LobbyStatus
    costLimit?: IntFieldUpdateOperationsInput | number
    turnTimeSeconds?: IntFieldUpdateOperationsInput | number
    maxScore?: IntFieldUpdateOperationsInput | number
    creatorGoesFirst?: NullableBoolFieldUpdateOperationsInput | boolean | null
    isAiGame?: BoolFieldUpdateOperationsInput | boolean
    aiDifficulty?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    joinedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    joinerFleetSetAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type LobbyUpdateWithoutJoinerInput = {
    status?: EnumLobbyStatusFieldUpdateOperationsInput | $Enums.LobbyStatus
    costLimit?: IntFieldUpdateOperationsInput | number
    turnTimeSeconds?: IntFieldUpdateOperationsInput | number
    maxScore?: IntFieldUpdateOperationsInput | number
    creatorGoesFirst?: NullableBoolFieldUpdateOperationsInput | boolean | null
    isAiGame?: BoolFieldUpdateOperationsInput | boolean
    aiDifficulty?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    joinedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    joinerFleetSetAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creator?: UserUpdateOneRequiredWithoutLobbiesCreatedNestedInput
    reservedJoiner?: UserUpdateOneWithoutLobbiesReservedNestedInput
    map?: MapUpdateOneWithoutLobbiesNestedInput
    fleets?: FleetUpdateManyWithoutLobbyNestedInput
    game?: GameUpdateOneWithoutLobbyNestedInput
  }

  export type LobbyUncheckedUpdateWithoutJoinerInput = {
    id?: IntFieldUpdateOperationsInput | number
    creatorId?: StringFieldUpdateOperationsInput | string
    reservedJoinerId?: NullableStringFieldUpdateOperationsInput | string | null
    mapId?: NullableIntFieldUpdateOperationsInput | number | null
    status?: EnumLobbyStatusFieldUpdateOperationsInput | $Enums.LobbyStatus
    costLimit?: IntFieldUpdateOperationsInput | number
    turnTimeSeconds?: IntFieldUpdateOperationsInput | number
    maxScore?: IntFieldUpdateOperationsInput | number
    creatorGoesFirst?: NullableBoolFieldUpdateOperationsInput | boolean | null
    isAiGame?: BoolFieldUpdateOperationsInput | boolean
    aiDifficulty?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    joinedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    joinerFleetSetAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fleets?: FleetUncheckedUpdateManyWithoutLobbyNestedInput
    game?: GameUncheckedUpdateOneWithoutLobbyNestedInput
  }

  export type LobbyUncheckedUpdateManyWithoutJoinerInput = {
    id?: IntFieldUpdateOperationsInput | number
    creatorId?: StringFieldUpdateOperationsInput | string
    reservedJoinerId?: NullableStringFieldUpdateOperationsInput | string | null
    mapId?: NullableIntFieldUpdateOperationsInput | number | null
    status?: EnumLobbyStatusFieldUpdateOperationsInput | $Enums.LobbyStatus
    costLimit?: IntFieldUpdateOperationsInput | number
    turnTimeSeconds?: IntFieldUpdateOperationsInput | number
    maxScore?: IntFieldUpdateOperationsInput | number
    creatorGoesFirst?: NullableBoolFieldUpdateOperationsInput | boolean | null
    isAiGame?: BoolFieldUpdateOperationsInput | boolean
    aiDifficulty?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    joinedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    joinerFleetSetAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type LobbyUpdateWithoutReservedJoinerInput = {
    status?: EnumLobbyStatusFieldUpdateOperationsInput | $Enums.LobbyStatus
    costLimit?: IntFieldUpdateOperationsInput | number
    turnTimeSeconds?: IntFieldUpdateOperationsInput | number
    maxScore?: IntFieldUpdateOperationsInput | number
    creatorGoesFirst?: NullableBoolFieldUpdateOperationsInput | boolean | null
    isAiGame?: BoolFieldUpdateOperationsInput | boolean
    aiDifficulty?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    joinedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    joinerFleetSetAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creator?: UserUpdateOneRequiredWithoutLobbiesCreatedNestedInput
    joiner?: UserUpdateOneWithoutLobbiesJoinedNestedInput
    map?: MapUpdateOneWithoutLobbiesNestedInput
    fleets?: FleetUpdateManyWithoutLobbyNestedInput
    game?: GameUpdateOneWithoutLobbyNestedInput
  }

  export type LobbyUncheckedUpdateWithoutReservedJoinerInput = {
    id?: IntFieldUpdateOperationsInput | number
    creatorId?: StringFieldUpdateOperationsInput | string
    joinerId?: NullableStringFieldUpdateOperationsInput | string | null
    mapId?: NullableIntFieldUpdateOperationsInput | number | null
    status?: EnumLobbyStatusFieldUpdateOperationsInput | $Enums.LobbyStatus
    costLimit?: IntFieldUpdateOperationsInput | number
    turnTimeSeconds?: IntFieldUpdateOperationsInput | number
    maxScore?: IntFieldUpdateOperationsInput | number
    creatorGoesFirst?: NullableBoolFieldUpdateOperationsInput | boolean | null
    isAiGame?: BoolFieldUpdateOperationsInput | boolean
    aiDifficulty?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    joinedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    joinerFleetSetAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fleets?: FleetUncheckedUpdateManyWithoutLobbyNestedInput
    game?: GameUncheckedUpdateOneWithoutLobbyNestedInput
  }

  export type LobbyUncheckedUpdateManyWithoutReservedJoinerInput = {
    id?: IntFieldUpdateOperationsInput | number
    creatorId?: StringFieldUpdateOperationsInput | string
    joinerId?: NullableStringFieldUpdateOperationsInput | string | null
    mapId?: NullableIntFieldUpdateOperationsInput | number | null
    status?: EnumLobbyStatusFieldUpdateOperationsInput | $Enums.LobbyStatus
    costLimit?: IntFieldUpdateOperationsInput | number
    turnTimeSeconds?: IntFieldUpdateOperationsInput | number
    maxScore?: IntFieldUpdateOperationsInput | number
    creatorGoesFirst?: NullableBoolFieldUpdateOperationsInput | boolean | null
    isAiGame?: BoolFieldUpdateOperationsInput | boolean
    aiDifficulty?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    joinedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    joinerFleetSetAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type GameUpdateWithoutPlayer1Input = {
    state?: JsonNullValueInput | InputJsonValue
    initialState?: NullableJsonNullValueInput | InputJsonValue
    currentTurn?: StringFieldUpdateOperationsInput | string
    currentRound?: IntFieldUpdateOperationsInput | number
    phase?: EnumGamePhaseFieldUpdateOperationsInput | $Enums.GamePhase
    winnerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lobby?: LobbyUpdateOneRequiredWithoutGameNestedInput
    player2?: UserUpdateOneRequiredWithoutGamesAsPlayer2NestedInput
    turns?: GameTurnUpdateManyWithoutGameNestedInput
  }

  export type GameUncheckedUpdateWithoutPlayer1Input = {
    id?: IntFieldUpdateOperationsInput | number
    lobbyId?: IntFieldUpdateOperationsInput | number
    player2Id?: StringFieldUpdateOperationsInput | string
    state?: JsonNullValueInput | InputJsonValue
    initialState?: NullableJsonNullValueInput | InputJsonValue
    currentTurn?: StringFieldUpdateOperationsInput | string
    currentRound?: IntFieldUpdateOperationsInput | number
    phase?: EnumGamePhaseFieldUpdateOperationsInput | $Enums.GamePhase
    winnerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    turns?: GameTurnUncheckedUpdateManyWithoutGameNestedInput
  }

  export type GameUncheckedUpdateManyWithoutPlayer1Input = {
    id?: IntFieldUpdateOperationsInput | number
    lobbyId?: IntFieldUpdateOperationsInput | number
    player2Id?: StringFieldUpdateOperationsInput | string
    state?: JsonNullValueInput | InputJsonValue
    initialState?: NullableJsonNullValueInput | InputJsonValue
    currentTurn?: StringFieldUpdateOperationsInput | string
    currentRound?: IntFieldUpdateOperationsInput | number
    phase?: EnumGamePhaseFieldUpdateOperationsInput | $Enums.GamePhase
    winnerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GameUpdateWithoutPlayer2Input = {
    state?: JsonNullValueInput | InputJsonValue
    initialState?: NullableJsonNullValueInput | InputJsonValue
    currentTurn?: StringFieldUpdateOperationsInput | string
    currentRound?: IntFieldUpdateOperationsInput | number
    phase?: EnumGamePhaseFieldUpdateOperationsInput | $Enums.GamePhase
    winnerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lobby?: LobbyUpdateOneRequiredWithoutGameNestedInput
    player1?: UserUpdateOneRequiredWithoutGamesAsPlayer1NestedInput
    turns?: GameTurnUpdateManyWithoutGameNestedInput
  }

  export type GameUncheckedUpdateWithoutPlayer2Input = {
    id?: IntFieldUpdateOperationsInput | number
    lobbyId?: IntFieldUpdateOperationsInput | number
    player1Id?: StringFieldUpdateOperationsInput | string
    state?: JsonNullValueInput | InputJsonValue
    initialState?: NullableJsonNullValueInput | InputJsonValue
    currentTurn?: StringFieldUpdateOperationsInput | string
    currentRound?: IntFieldUpdateOperationsInput | number
    phase?: EnumGamePhaseFieldUpdateOperationsInput | $Enums.GamePhase
    winnerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    turns?: GameTurnUncheckedUpdateManyWithoutGameNestedInput
  }

  export type GameUncheckedUpdateManyWithoutPlayer2Input = {
    id?: IntFieldUpdateOperationsInput | number
    lobbyId?: IntFieldUpdateOperationsInput | number
    player1Id?: StringFieldUpdateOperationsInput | string
    state?: JsonNullValueInput | InputJsonValue
    initialState?: NullableJsonNullValueInput | InputJsonValue
    currentTurn?: StringFieldUpdateOperationsInput | string
    currentRound?: IntFieldUpdateOperationsInput | number
    phase?: EnumGamePhaseFieldUpdateOperationsInput | $Enums.GamePhase
    winnerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FleetUpdateWithoutOwnerInput = {
    shipIds?: FleetUpdateshipIdsInput | number[]
    totalCost?: IntFieldUpdateOperationsInput | number
    isComplete?: BoolFieldUpdateOperationsInput | boolean
    startingPositions?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lobby?: LobbyUpdateOneRequiredWithoutFleetsNestedInput
  }

  export type FleetUncheckedUpdateWithoutOwnerInput = {
    id?: IntFieldUpdateOperationsInput | number
    lobbyId?: IntFieldUpdateOperationsInput | number
    shipIds?: FleetUpdateshipIdsInput | number[]
    totalCost?: IntFieldUpdateOperationsInput | number
    isComplete?: BoolFieldUpdateOperationsInput | boolean
    startingPositions?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FleetUncheckedUpdateManyWithoutOwnerInput = {
    id?: IntFieldUpdateOperationsInput | number
    lobbyId?: IntFieldUpdateOperationsInput | number
    shipIds?: FleetUpdateshipIdsInput | number[]
    totalCost?: IntFieldUpdateOperationsInput | number
    isComplete?: BoolFieldUpdateOperationsInput | boolean
    startingPositions?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FleetCreateManyLobbyInput = {
    id?: number
    ownerId: string
    shipIds?: FleetCreateshipIdsInput | number[]
    totalCost?: number
    isComplete?: boolean
    startingPositions?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type FleetUpdateWithoutLobbyInput = {
    shipIds?: FleetUpdateshipIdsInput | number[]
    totalCost?: IntFieldUpdateOperationsInput | number
    isComplete?: BoolFieldUpdateOperationsInput | boolean
    startingPositions?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    owner?: UserUpdateOneRequiredWithoutFleetsNestedInput
  }

  export type FleetUncheckedUpdateWithoutLobbyInput = {
    id?: IntFieldUpdateOperationsInput | number
    ownerId?: StringFieldUpdateOperationsInput | string
    shipIds?: FleetUpdateshipIdsInput | number[]
    totalCost?: IntFieldUpdateOperationsInput | number
    isComplete?: BoolFieldUpdateOperationsInput | boolean
    startingPositions?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FleetUncheckedUpdateManyWithoutLobbyInput = {
    id?: IntFieldUpdateOperationsInput | number
    ownerId?: StringFieldUpdateOperationsInput | string
    shipIds?: FleetUpdateshipIdsInput | number[]
    totalCost?: IntFieldUpdateOperationsInput | number
    isComplete?: BoolFieldUpdateOperationsInput | boolean
    startingPositions?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GameTurnCreateManyGameInput = {
    id?: number
    playerId: string
    round: number
    actions: JsonNullValueInput | InputJsonValue
    snapshot?: NullableJsonNullValueInput | InputJsonValue
    submittedAt?: Date | string
  }

  export type GameTurnUpdateWithoutGameInput = {
    playerId?: StringFieldUpdateOperationsInput | string
    round?: IntFieldUpdateOperationsInput | number
    actions?: JsonNullValueInput | InputJsonValue
    snapshot?: NullableJsonNullValueInput | InputJsonValue
    submittedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GameTurnUncheckedUpdateWithoutGameInput = {
    id?: IntFieldUpdateOperationsInput | number
    playerId?: StringFieldUpdateOperationsInput | string
    round?: IntFieldUpdateOperationsInput | number
    actions?: JsonNullValueInput | InputJsonValue
    snapshot?: NullableJsonNullValueInput | InputJsonValue
    submittedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GameTurnUncheckedUpdateManyWithoutGameInput = {
    id?: IntFieldUpdateOperationsInput | number
    playerId?: StringFieldUpdateOperationsInput | string
    round?: IntFieldUpdateOperationsInput | number
    actions?: JsonNullValueInput | InputJsonValue
    snapshot?: NullableJsonNullValueInput | InputJsonValue
    submittedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LobbyCreateManyMapInput = {
    id?: number
    creatorId: string
    joinerId?: string | null
    reservedJoinerId?: string | null
    status?: $Enums.LobbyStatus
    costLimit?: number
    turnTimeSeconds?: number
    maxScore?: number
    creatorGoesFirst?: boolean | null
    isAiGame?: boolean
    aiDifficulty?: string | null
    createdAt?: Date | string
    joinedAt?: Date | string | null
    joinerFleetSetAt?: Date | string | null
  }

  export type LobbyUpdateWithoutMapInput = {
    status?: EnumLobbyStatusFieldUpdateOperationsInput | $Enums.LobbyStatus
    costLimit?: IntFieldUpdateOperationsInput | number
    turnTimeSeconds?: IntFieldUpdateOperationsInput | number
    maxScore?: IntFieldUpdateOperationsInput | number
    creatorGoesFirst?: NullableBoolFieldUpdateOperationsInput | boolean | null
    isAiGame?: BoolFieldUpdateOperationsInput | boolean
    aiDifficulty?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    joinedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    joinerFleetSetAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creator?: UserUpdateOneRequiredWithoutLobbiesCreatedNestedInput
    joiner?: UserUpdateOneWithoutLobbiesJoinedNestedInput
    reservedJoiner?: UserUpdateOneWithoutLobbiesReservedNestedInput
    fleets?: FleetUpdateManyWithoutLobbyNestedInput
    game?: GameUpdateOneWithoutLobbyNestedInput
  }

  export type LobbyUncheckedUpdateWithoutMapInput = {
    id?: IntFieldUpdateOperationsInput | number
    creatorId?: StringFieldUpdateOperationsInput | string
    joinerId?: NullableStringFieldUpdateOperationsInput | string | null
    reservedJoinerId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumLobbyStatusFieldUpdateOperationsInput | $Enums.LobbyStatus
    costLimit?: IntFieldUpdateOperationsInput | number
    turnTimeSeconds?: IntFieldUpdateOperationsInput | number
    maxScore?: IntFieldUpdateOperationsInput | number
    creatorGoesFirst?: NullableBoolFieldUpdateOperationsInput | boolean | null
    isAiGame?: BoolFieldUpdateOperationsInput | boolean
    aiDifficulty?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    joinedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    joinerFleetSetAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fleets?: FleetUncheckedUpdateManyWithoutLobbyNestedInput
    game?: GameUncheckedUpdateOneWithoutLobbyNestedInput
  }

  export type LobbyUncheckedUpdateManyWithoutMapInput = {
    id?: IntFieldUpdateOperationsInput | number
    creatorId?: StringFieldUpdateOperationsInput | string
    joinerId?: NullableStringFieldUpdateOperationsInput | string | null
    reservedJoinerId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumLobbyStatusFieldUpdateOperationsInput | $Enums.LobbyStatus
    costLimit?: IntFieldUpdateOperationsInput | number
    turnTimeSeconds?: IntFieldUpdateOperationsInput | number
    maxScore?: IntFieldUpdateOperationsInput | number
    creatorGoesFirst?: NullableBoolFieldUpdateOperationsInput | boolean | null
    isAiGame?: BoolFieldUpdateOperationsInput | boolean
    aiDifficulty?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    joinedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    joinerFleetSetAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}