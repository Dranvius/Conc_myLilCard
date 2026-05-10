import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { Proposal } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/format';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 12,
    color: '#333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    borderBottom: '2px solid #0f6c8d',
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: 'column',
  },
  title: {
    fontSize: 24,
    color: '#0f6c8d',
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  companyInfo: {
    textAlign: 'right',
    color: '#666',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    backgroundColor: '#f5f5f5',
    padding: 8,
    marginBottom: 10,
    color: '#0f6c8d',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: 150,
    fontWeight: 'bold',
  },
  value: {
    flex: 1,
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    marginBottom: 30,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableHeader: {
    backgroundColor: '#0f6c8d',
    color: '#fff',
    fontWeight: 'bold',
  },
  tableColHeader: {
    width: '20%',
    padding: 8,
  },
  tableColHeaderProduct: {
    width: '40%',
    padding: 8,
  },
  tableCol: {
    width: '20%',
    padding: 8,
    borderBottomWidth: 1,
    borderColor: '#e5e5e5',
  },
  tableColProduct: {
    width: '40%',
    padding: 8,
    borderBottomWidth: 1,
    borderColor: '#e5e5e5',
  },
  totalsContainer: {
    alignItems: 'flex-end',
    marginTop: 20,
  },
  totalRow: {
    flexDirection: 'row',
    marginBottom: 5,
    width: 250,
  },
  totalLabel: {
    width: 100,
    textAlign: 'right',
    paddingRight: 10,
  },
  totalValue: {
    width: 150,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#999',
    fontSize: 10,
    borderTop: '1px solid #e5e5e5',
    paddingTop: 10,
  },
});

export const ProposalPDF = ({ proposal }: { proposal: Proposal }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Propuesta Comercial</Text>
          <Text style={styles.subtitle}>{proposal.code}</Text>
        </View>
        <View style={styles.companyInfo}>
          <Text style={{ fontWeight: 'bold', color: '#0f6c8d' }}>RespiraCRM Medical</Text>
          <Text>Bogotá, Colombia</Text>
          <Text>info@respiracrm.local</Text>
        </View>
      </View>

      {/* Info Cliente */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información del Cliente</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Empresa:</Text>
          <Text style={styles.value}>{proposal.opportunity?.company?.name || 'N/A'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Atención a:</Text>
          <Text style={styles.value}>
            {proposal.opportunity?.contact 
              ? `${proposal.opportunity.contact.firstName} ${proposal.opportunity.contact.lastName}` 
              : 'Departamento de Compras'}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Fecha de validez:</Text>
          <Text style={styles.value}>{formatDate(proposal.validUntil)}</Text>
        </View>
      </View>

      {/* Tabla de Productos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Detalle de Productos</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <View style={styles.tableColHeaderProduct}><Text>Producto</Text></View>
            <View style={styles.tableColHeader}><Text>Cantidad</Text></View>
            <View style={styles.tableColHeader}><Text>V. Unitario</Text></View>
            <View style={styles.tableColHeader}><Text>Subtotal</Text></View>
          </View>
          
          {proposal.items?.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <View style={styles.tableColProduct}>
                <Text>{item.product?.name}</Text>
                {item.product?.sku && <Text style={{ fontSize: 9, color: '#666' }}>SKU: {item.product.sku}</Text>}
              </View>
              <View style={styles.tableCol}><Text>{item.quantity}</Text></View>
              <View style={styles.tableCol}><Text>{formatCurrency(item.unitPrice)}</Text></View>
              <View style={styles.tableCol}><Text>{formatCurrency(item.total)}</Text></View>
            </View>
          ))}
        </View>

        {/* Totales */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{formatCurrency(proposal.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Impuestos ({proposal.taxRate}%):</Text>
            <Text style={styles.totalValue}>{formatCurrency(proposal.taxAmount)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Final:</Text>
            <Text style={[styles.totalValue, { color: '#0f6c8d', fontSize: 14 }]}>{formatCurrency(proposal.totalAmount)}</Text>
          </View>
        </View>
      </View>

      {/* Notas */}
      {proposal.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notas Adicionales</Text>
          <Text>{proposal.notes}</Text>
        </View>
      )}

      {/* Footer */}
      <Text style={styles.footer}>
        Documento generado automáticamente por RespiraCRM. Los precios están sujetos a cambios después de la fecha de validez.
      </Text>
    </Page>
  </Document>
);
