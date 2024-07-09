import { Ban, Instance as InstanceDB } from "@prisma/client";
import { prisma } from "../lib/prisma";

export interface IInstanceMeta {
  logo_uri?: string;
  banner_uri?: string;
  name?: string;
}

export class Instance {
  private instance: InstanceDB;

  private constructor(data: InstanceDB) {
    this.instance = data;
  }

  get hostname() {
    return this.instance.hostname;
  }

  /**
   * Update Instance instance
   *
   * @throws InstanceNotFound Instance no longer exists (was deleted?)
   */
  async update() {
    const instance = await prisma.instance.findFirst({
      where: {
        id: this.instance.id,
      },
    });

    if (!instance) throw new InstanceNotFound("Instance no longer exists");

    this.instance = instance;
  }

  /**
   * Get effective ban
   *
   * Filters through any subdomain bans
   */
  async getEffectiveBan(): Promise<(Ban & { hostname: string }) | undefined> {
    let applicable: Ban | undefined | null;
    let hostname: string = this.instance.hostname;

    const check = async (domain: string): Promise<any> => {
      const instance = await Instance.fromDomain(domain);
      hostname = domain;
      applicable = await instance.getBan();

      if (!applicable) {
        const newDomain = domain.split(".").slice(1).join(".");
        if (newDomain) {
          return check(newDomain);
        }
      }
    };

    await check(this.instance.hostname);

    return applicable
      ? {
          ...applicable,
          hostname,
        }
      : undefined;
  }

  /**
   * Get ban for this hostname
   *
   * @see Instance#getBans use this instead
   */
  async getBan() {
    const ban = await prisma.ban.findFirst({
      where: {
        instanceId: this.instance.id,
      },
    });

    return ban;
  }

  /**
   * Bans an instance (create / update)
   *
   * This bans all subdomains
   *
   * @note does not create audit log
   * @note does not retroactively ban users, only blocks new users
   */
  async ban(
    expires: Date,
    publicNote: string | null | undefined,
    privateNote: string | null | undefined
  ) {
    /*const subdomains = await Instance.getRegisteredSubdomains(
      this.instance.hostname
    );
    const existing = await this.getBan();*/
    const ban = await prisma.ban.upsert({
      where: {
        instanceId: this.instance.id,
      },
      create: {
        instanceId: this.instance.id,
        expiresAt: expires,
        publicNote,
        privateNote,
      },
      update: {
        instanceId: this.instance.id,
        expiresAt: expires,
        publicNote,
        privateNote,
      },
    });

    return ban;
  }

  /**
   * Unbans an instance
   *
   * @note does not create audit log
   * @note does not unban a subdomain that was banned because of inheritance
   * @throws InstanceNotBanned
   */
  async unban() {
    const existing = await this.getBan();

    if (!existing) throw new InstanceNotBanned();

    const ban = await prisma.ban.delete({
      where: { id: existing.id },
    });

    return ban;
  }

  static async fromDomain(hostname: string): Promise<Instance> {
    const instance = await prisma.instance.upsert({
      where: {
        hostname,
      },
      update: {},
      create: {
        hostname,
      },
    });

    return new this(instance);
  }

  /**
   * Get instance from hostname & update with new instance meta
   * @param hostname
   * @param instanceMeta
   * @returns
   */
  static async fromAuth(
    hostname: string,
    instanceMeta: IInstanceMeta
  ): Promise<Instance> {
    if (!this.isHostnameValid(hostname)) {
      throw new InstanceInvalid();
    }

    const instance = await prisma.instance.upsert({
      where: {
        hostname,
      },
      update: {
        hostname,
        name: instanceMeta.name,
        logo_url: instanceMeta.logo_uri,
        banner_url: instanceMeta.banner_uri,
      },
      create: {
        hostname,
        name: instanceMeta.name,
        logo_url: instanceMeta.logo_uri,
        banner_url: instanceMeta.banner_uri,
      },
    });

    return new this(instance);
  }

  /**
   * Get all registered subdomains from a domain
   * @param hostname
   */
  static async getRegisteredSubdomains(hostname: string): Promise<Instance[]> {
    return [];
  }

  /**
   * Determine if a hostname is valid to be an instance
   *
   * Currently restricts the amount of domain parts
   *
   * @param hostname
   * @returns
   */
  static isHostnameValid(hostname: string): boolean {
    return (hostname.match(/\./g) || []).length <= 5;
  }
}

export class InstanceInvalid extends Error {
  constructor() {
    super();
    this.name = "InstanceInvalid";
  }
}

export class InstanceNotFound extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "InstanceNotFound";
  }
}

export class InstanceNotBanned extends Error {
  constructor() {
    super();
    this.name = "InstanceNotBanned";
  }
}
