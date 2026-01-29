# Open Source Secrets Management

| Nome | GitHub | Linguaggio | Database | Note |
|------|--------|------------|----------|------|
| **Infisical** | https://github.com/Infisical/infisical | TypeScript | PostgreSQL | Il più popolare, 20k+ stars |
| **Phase** | https://github.com/phasehq/console | TypeScript | PostgreSQL | Focus su DX, self-hosted friendly |
| **HashiCorp Vault** | https://github.com/hashicorp/vault | Go | Pluggable | Enterprise, più complesso |
| **Confidant** | https://github.com/lyft/confidant | Python | DynamoDB | Di Lyft, AWS-native |
| **OpenBao** | https://github.com/openbao/openbao | Go | Pluggable | Fork open di Vault |
| **Doppler** | Closed source | - | - | Solo SaaS, no self-hosted |

# Secrets Management - Compliance e Certificazioni

## Confronto Certificazioni

| Certificazione | Infisical | HashiCorp Vault | Phase |
|----------------|-----------|-----------------|-------|
| **SOC 2 Type II** | ✅ | ✅ | ❌ |
| **ISO 27001** | ❌ | ✅ | ❌ |
| **ISO 27017** (cloud security) | ❌ | ✅ | ❌ |
| **ISO 27018** (cloud privacy) | ❌ | ✅ | ❌ |
| **HIPAA** | ✅ | ✅ | ❌ |
| **FIPS 140-2** | ❌ | ✅ (Enterprise) | ❌ |
| **FIPS 140-3** | ✅ | ✅ | ❌ |
| **GDPR** | ✅ (EU hosting) | ✅ | ✅ (EU hosting) |
| **FedRAMP** | ❌ | ❌ | ❌ |

## Note

- **SOC 2 Type I** = snapshot a un momento specifico
- **SOC 2 Type II** = audit su periodo 3-12 mesi (più affidabile)
- **FIPS 140-2/3** = requisito per governo USA e contractor
- **99.99% uptime** = max ~52 minuti di downtime all'anno
- **99.9% uptime** = max ~8.7 ore di downtime all'anno

## Implicazioni per Mull

Per competere nel mercato enterprise, Mull dovrà considerare:

1. **MVP/Startup**: Nessuna certificazione richiesta
2. **SMB**: SOC 2 Type I come minimo
3. **Enterprise**: SOC 2 Type II + possibilmente ISO 27001
4. **Government/Finance**: FIPS 140-2, FedRAMP

Il costo per ottenere SOC 2 Type II è circa **$20,000-50,000** per il primo audit.