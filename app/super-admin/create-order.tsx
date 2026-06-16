import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  ACADEMIC_YEAR,
  CATEGORY_OPTIONS,
  ORDER_TYPE_OPTIONS,
  WIZARD_STEPS,
  computeFinancials,
  emptyFinancial,
  formatInr,
  validateStep3Financial,
  type CreateOrderState,
  type FinancialDetails,
  type ProductBundle,
  type School,
  type SelectedProduct,
} from '../../src/lib/create-order/types';
import { fetchSchoolsForOrder } from '../../src/lib/create-order/schools-for-order';
import {
  createCatalogProduct,
  deleteCatalogProduct,
  fetchOrderCatalog,
} from '../../src/lib/create-order/order-catalog-api';
import {
  confirmOrder,
  fetchOrderById,
  saveOrderDraft,
  uploadOrderDocument,
} from '../../src/lib/create-order/create-order-api';
import { savedOrderToEditState } from '../../src/lib/create-order/order-utils';

function OptionPicker({
  visible,
  title,
  options,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: string[];
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.pickerOverlay}>
        <View style={s.pickerSheet}>
          <Text style={s.pickerTitle}>{title}</Text>
          <ScrollView style={{ maxHeight: 360 }}>
            {options.map((opt) => (
              <Pressable
                key={opt}
                style={s.pickerItem}
                onPress={() => {
                  onSelect(opt);
                  onClose();
                }}
              >
                <Text style={s.pickerItemText}>{opt}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable style={s.pickerClose} onPress={onClose}>
            <Text style={s.pickerCloseText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function bundleToProduct(bundle: ProductBundle): SelectedProduct {
  return {
    id: bundle.id,
    name: bundle.name,
    classLabel: bundle.classLabel,
    price: bundle.price,
    qty: 1,
    comp: 0,
    isCustom: bundle.id.startsWith('custom-'),
  };
}

export default function CreateOrderScreen() {
  const router = useRouter();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const editingOrderId = typeof editId === 'string' ? editId : undefined;

  const [step, setStep] = useState(1);
  const [loadingInit, setLoadingInit] = useState(Boolean(editingOrderId));
  const [submitting, setSubmitting] = useState<'draft' | 'confirm' | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [financial, setFinancial] = useState<FinancialDetails>(emptyFinancial());
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolSearch, setSchoolSearch] = useState('');
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [catalog, setCatalog] = useState<ProductBundle[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customClass, setCustomClass] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [orderTypePicker, setOrderTypePicker] = useState(false);
  const [categoryPicker, setCategoryPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStep3Errors, setShowStep3Errors] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const computed = useMemo(
    () =>
      computeFinancials(
        selectedProducts,
        financial.itemDiscount,
        financial.specialDiscount,
        financial.advanceReceived,
      ),
    [selectedProducts, financial.itemDiscount, financial.specialDiscount, financial.advanceReceived],
  );

  const state: CreateOrderState = useMemo(
    () => ({ selectedSchool, selectedProducts, financial, computed }),
    [selectedSchool, selectedProducts, financial, computed],
  );

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      setCatalog(await fetchOrderCatalog());
    } catch {
      // keep empty — no hardcoded fallback
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (!editingOrderId) return;
    void (async () => {
      setLoadingInit(true);
      try {
        const order = await fetchOrderById(editingOrderId);
        const edit = savedOrderToEditState(order);
        setSelectedSchool(edit.selectedSchool);
        setSelectedProducts(edit.selectedProducts);
        setFinancial(edit.financial);
      } catch (e: unknown) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Could not load order');
        router.back();
      } finally {
        setLoadingInit(false);
      }
    })();
  }, [editingOrderId, router]);

  useEffect(() => {
    if (step !== 1) return;
    void (async () => {
      setSchoolsLoading(true);
      try {
        setSchools(await fetchSchoolsForOrder());
      } catch (e: unknown) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Failed to load schools');
      } finally {
        setSchoolsLoading(false);
      }
    })();
  }, [step]);

  const filteredSchools = useMemo(() => {
    const q = schoolSearch.trim().toLowerCase();
    if (!q) return schools;
    return schools.filter(
      (sc) =>
        sc.name.toLowerCase().includes(q) ||
        sc.city.toLowerCase().includes(q) ||
        (sc.state || '').toLowerCase().includes(q),
    );
  }, [schools, schoolSearch]);

  const addProduct = (product: SelectedProduct) => {
    setSelectedProducts((prev) => {
      const existing = prev.find((p) => p.id === product.id);
      if (existing) {
        return prev.map((p) => (p.id === product.id ? { ...p, qty: p.qty + 1 } : p));
      }
      return [...prev, { ...product, qty: 1, comp: 0 }];
    });
  };

  const updateQty = (id: string, qty: number) => {
    if (qty < 1) {
      setSelectedProducts((prev) => prev.filter((p) => p.id !== id));
      return;
    }
    setSelectedProducts((prev) => prev.map((p) => (p.id === id ? { ...p, qty } : p)));
  };

  const updateComp = (id: string, comp: number) => {
    setSelectedProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, comp: Math.max(0, comp) } : p)),
    );
  };

  const handleDeleteCatalog = (bundle: ProductBundle) => {
    Alert.alert('Delete product?', `Remove "${bundle.name}" from catalog?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const result = await deleteCatalogProduct(bundle.id);
            if (result.success) {
              setCatalog((prev) => prev.filter((b) => b.id !== bundle.id));
              setSelectedProducts((prev) => prev.filter((p) => p.id !== bundle.id));
            } else {
              Alert.alert('Error', result.message);
            }
          })();
        },
      },
    ]);
  };

  const handleAddCustom = async () => {
    const name = customName.trim();
    const classLabel = customClass.trim();
    const price = Number(customPrice);
    if (!name || !classLabel || !Number.isFinite(price) || price <= 0) {
      Alert.alert('Validation', 'Enter product name, class, and a valid price.');
      return;
    }
    const id = `custom-${Date.now()}`;
    const bundle: ProductBundle = { id, name, classLabel, price };
    const result = await createCatalogProduct({ ...bundle, isCustom: true });
    if (!result.success) {
      Alert.alert('Error', result.message);
      return;
    }
    setCatalog((prev) => [...prev, result.data ?? bundle]);
    addProduct({ ...bundleToProduct(bundle), isCustom: true });
    setCustomName('');
    setCustomClass('');
    setCustomPrice('');
    setShowCustomForm(false);
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setUploadingDoc(true);
      const uploaded = await uploadOrderDocument({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
      });
      setFinancial((f) => ({
        ...f,
        documentUri: asset.uri,
        documentPreviewUrl: uploaded.url,
        documentName: uploaded.name,
      }));
    } catch (e: unknown) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Could not upload document');
    } finally {
      setUploadingDoc(false);
    }
  };

  const canContinue = () => {
    if (step === 1) return Boolean(selectedSchool);
    if (step === 2) return selectedProducts.length > 0;
    if (step === 3) return Object.keys(validateStep3Financial(state)).length === 0;
    return true;
  };

  const handleNext = () => {
    if (step === 3) {
      const errs = validateStep3Financial(state);
      if (Object.keys(errs).length > 0) {
        setShowStep3Errors(true);
        Alert.alert('Validation', 'Fill in order type, category, and payment due date.');
        return;
      }
    }
    if (step < 4) setStep(step + 1);
  };

  const handleSaveDraft = async () => {
    setSubmitting('draft');
    const result = await saveOrderDraft(state, editingOrderId);
    setSubmitting(null);
    if (result.success) {
      Alert.alert('Saved', result.message || 'Draft saved', [{ text: 'OK', onPress: () => router.back() }]);
    } else {
      Alert.alert('Error', result.message);
    }
  };

  const handleConfirm = async () => {
    setSubmitting('confirm');
    const result = await confirmOrder(state, editingOrderId);
    setSubmitting(null);
    if (result.success) {
      Alert.alert('Success', result.message || 'Order confirmed', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert('Error', result.message);
    }
  };

  const step3Errors = showStep3Errors ? validateStep3Financial(state) : {};

  if (loadingInit) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loadingBox}>
          <ActivityIndicator size="large" color="#ea580c" />
          <Text style={s.loadingText}>Loading order…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.topBar}>
          <TouchableOpacity style={s.backBtn} onPress={() => (step > 1 ? setStep(step - 1) : router.back())}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={s.topTitle}>{editingOrderId ? 'Edit Order' : 'Create Order'}</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <View style={s.stepper}>
          {WIZARD_STEPS.map((st) => (
            <View key={st.id} style={s.stepItem}>
              <View style={[s.stepDot, step >= st.id && s.stepDotActive]}>
                <Text style={[s.stepDotText, step >= st.id && s.stepDotTextActive]}>{st.id}</Text>
              </View>
              <Text style={[s.stepLabel, step === st.id && s.stepLabelActive]}>{st.label}</Text>
            </View>
          ))}
        </View>

        <ScrollView style={s.body} contentContainerStyle={s.bodyContent} keyboardShouldPersistTaps="handled">
          {step === 1 && (
            <>
              <Text style={s.sectionTitle}>Select School</Text>
              <TextInput
                style={s.input}
                placeholder="Search schools…"
                value={schoolSearch}
                onChangeText={setSchoolSearch}
              />
              {schoolsLoading ? (
                <ActivityIndicator color="#ea580c" style={{ marginTop: 24 }} />
              ) : (
                filteredSchools.map((school) => {
                  const selected = selectedSchool?.id === school.id;
                  return (
                    <Pressable
                      key={school.id}
                      style={[s.schoolCard, selected && s.schoolCardSelected]}
                      onPress={() => setSelectedSchool(school)}
                    >
                      <Text style={s.schoolName}>{school.name}</Text>
                      <Text style={s.schoolMeta}>
                        {school.city} · {school.brand}
                      </Text>
                      {selected && <Ionicons name="checkmark-circle" size={22} color="#ea580c" style={s.checkIcon} />}
                    </Pressable>
                  );
                })
              )}
            </>
          )}

          {step === 2 && (
            <>
              <Text style={s.sectionTitle}>Product Catalog</Text>
              {catalogLoading ? (
                <ActivityIndicator color="#ea580c" />
              ) : catalog.length === 0 ? (
                <Text style={s.muted}>No catalog products. Add a custom product below.</Text>
              ) : (
                catalog.map((bundle) => (
                  <View key={bundle.id} style={s.catalogCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.productTitle}>{bundle.name}</Text>
                      <Text style={s.productMeta}>
                        {bundle.classLabel} · {formatInr(bundle.price)}
                      </Text>
                    </View>
                    <View style={s.catalogActions}>
                      <TouchableOpacity style={s.smallBtnPrimary} onPress={() => addProduct(bundleToProduct(bundle))}>
                        <Text style={s.smallBtnPrimaryText}>Add</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.smallBtnDanger} onPress={() => handleDeleteCatalog(bundle)}>
                        <Ionicons name="trash-outline" size={16} color="#dc2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}

              {!showCustomForm ? (
                <TouchableOpacity style={s.dashedBtn} onPress={() => setShowCustomForm(true)}>
                  <Ionicons name="add-circle-outline" size={20} color="#ea580c" />
                  <Text style={s.dashedBtnText}>Add New Product</Text>
                </TouchableOpacity>
              ) : (
                <View style={s.customForm}>
                  <TextInput style={s.input} placeholder="Product name" value={customName} onChangeText={setCustomName} />
                  <TextInput style={s.input} placeholder="Class / bundle" value={customClass} onChangeText={setCustomClass} />
                  <TextInput style={s.input} placeholder="Price (₹)" value={customPrice} onChangeText={setCustomPrice} keyboardType="numeric" />
                  <View style={s.row}>
                    <TouchableOpacity style={s.btnOutline} onPress={() => setShowCustomForm(false)}>
                      <Text style={s.btnOutlineText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.btnPrimary} onPress={() => void handleAddCustom()}>
                      <Text style={s.btnPrimaryText}>Add Product</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <Text style={[s.sectionTitle, { marginTop: 20 }]}>Added Products ({selectedProducts.length})</Text>
              {selectedProducts.map((p) => (
                <View key={p.id} style={s.addedCard}>
                  <Text style={s.productTitle}>{p.name}</Text>
                  <Text style={s.productMeta}>{formatInr(p.price)} each</Text>
                  <View style={s.qtyRow}>
                    <TouchableOpacity style={s.qtyBtn} onPress={() => updateQty(p.id, p.qty - 1)}>
                      <Ionicons name="remove" size={18} color="#374151" />
                    </TouchableOpacity>
                    <Text style={s.qtyText}>{p.qty}</Text>
                    <TouchableOpacity style={s.qtyBtn} onPress={() => updateQty(p.id, p.qty + 1)}>
                      <Ionicons name="add" size={18} color="#374151" />
                    </TouchableOpacity>
                    <Text style={s.lineTotal}>{formatInr(p.price * p.qty)}</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {step === 3 && (
            <>
              <Text style={s.sectionTitle}>Financial Details</Text>
              {selectedProducts.map((p) => (
                <View key={p.id} style={s.finProductRow}>
                  <Text style={s.finProductName} numberOfLines={1}>
                    {p.name} × {p.qty}
                  </Text>
                  <TextInput
                    style={s.compInput}
                    keyboardType="numeric"
                    value={String(p.comp)}
                    onChangeText={(t) => updateComp(p.id, Number(t) || 0)}
                  />
                </View>
              ))}

              <Pressable style={s.selectField} onPress={() => setOrderTypePicker(true)}>
                <Text style={s.fieldLabel}>Order Type *</Text>
                <Text style={financial.orderType ? s.fieldValue : s.fieldPlaceholder}>
                  {financial.orderType || 'Select order type'}
                </Text>
              </Pressable>
              {step3Errors.orderType && <Text style={s.errorText}>{step3Errors.orderType}</Text>}

              <Pressable style={s.selectField} onPress={() => setCategoryPicker(true)}>
                <Text style={s.fieldLabel}>Category *</Text>
                <Text style={financial.category ? s.fieldValue : s.fieldPlaceholder}>
                  {financial.category || 'Select category'}
                </Text>
              </Pressable>
              {step3Errors.category && <Text style={s.errorText}>{step3Errors.category}</Text>}

              <Text style={s.fieldLabel}>Payment Terms</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Net 30"
                value={financial.paymentTerms}
                onChangeText={(t) => setFinancial((f) => ({ ...f, paymentTerms: t }))}
              />

              <Pressable style={s.selectField} onPress={() => setShowDatePicker(true)}>
                <Text style={s.fieldLabel}>Payment Due Date *</Text>
                <Text style={financial.paymentDueDate ? s.fieldValue : s.fieldPlaceholder}>
                  {financial.paymentDueDate || 'Select date'}
                </Text>
              </Pressable>
              {step3Errors.paymentDueDate && <Text style={s.errorText}>{step3Errors.paymentDueDate}</Text>}

              {showDatePicker && (
                <DateTimePicker
                  value={financial.paymentDueDate ? new Date(financial.paymentDueDate) : new Date()}
                  mode="date"
                  onChange={(_, date) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (date) {
                      const iso = date.toISOString().slice(0, 10);
                      setFinancial((f) => ({ ...f, paymentDueDate: iso }));
                    }
                  }}
                />
              )}

              <Text style={s.fieldLabel}>Notes</Text>
              <TextInput
                style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]}
                multiline
                value={financial.notes}
                onChangeText={(t) => setFinancial((f) => ({ ...f, notes: t }))}
              />

              <Text style={s.fieldLabel}>Source Document</Text>
              {financial.documentName ? (
                <View style={s.docRow}>
                  <Ionicons name="document-text-outline" size={24} color="#ea580c" />
                  <Text style={s.docName} numberOfLines={2}>
                    {financial.documentName}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      setFinancial((f) => ({
                        ...f,
                        documentUri: null,
                        documentPreviewUrl: null,
                        documentName: null,
                      }))
                    }
                  >
                    <Ionicons name="close-circle" size={22} color="#9ca3af" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={s.uploadBtn} onPress={() => void pickDocument()} disabled={uploadingDoc}>
                  {uploadingDoc ? (
                    <ActivityIndicator color="#ea580c" />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload-outline" size={24} color="#ea580c" />
                      <Text style={s.uploadText}>Upload PDF or image</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              <View style={s.summaryCard}>
                <Text style={s.summaryTitle}>Financial Summary</Text>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Subtotal</Text>
                  <Text style={s.summaryValue}>{formatInr(computed.subtotal)}</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Special Discount (₹)</Text>
                  <TextInput
                    style={s.amountInput}
                    keyboardType="numeric"
                    value={String(financial.specialDiscount || '')}
                    onChangeText={(t) =>
                      setFinancial((f) => ({ ...f, specialDiscount: Math.max(0, Number(t) || 0) }))
                    }
                  />
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>GST (12%)</Text>
                  <Text style={s.summaryValue}>{formatInr(computed.gst)}</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabelBold}>Grand Total</Text>
                  <Text style={s.summaryTotal}>{formatInr(computed.grandTotal)}</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Advance Received (₹)</Text>
                  <TextInput
                    style={s.amountInput}
                    keyboardType="numeric"
                    value={String(financial.advanceReceived || '')}
                    onChangeText={(t) =>
                      setFinancial((f) => ({ ...f, advanceReceived: Math.max(0, Number(t) || 0) }))
                    }
                  />
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabelBold}>Balance</Text>
                  <Text style={[s.summaryTotal, { color: '#d97706' }]}>{formatInr(computed.balance)}</Text>
                </View>
              </View>
            </>
          )}

          {step === 4 && selectedSchool && (
            <>
              <Text style={s.sectionTitle}>Review Order</Text>
              <View style={s.reviewCard}>
                <Text style={s.reviewLabel}>School</Text>
                <Text style={s.reviewValue}>{selectedSchool.name}</Text>
                <Text style={s.reviewLabel}>Brand</Text>
                <Text style={s.reviewValue}>{selectedSchool.brand}</Text>
                <Text style={s.reviewLabel}>Order Type</Text>
                <Text style={s.reviewValue}>{financial.orderType}</Text>
                <Text style={s.reviewLabel}>Category</Text>
                <Text style={s.reviewValue}>{financial.category}</Text>
                <Text style={s.reviewLabel}>Academic Year</Text>
                <Text style={s.reviewValue}>{ACADEMIC_YEAR}</Text>
                <Text style={s.reviewLabel}>Due Date</Text>
                <Text style={s.reviewValue}>{financial.paymentDueDate}</Text>
              </View>
              <Text style={s.sectionTitle}>Products ({selectedProducts.length})</Text>
              {selectedProducts.map((p) => (
                <View key={p.id} style={s.addedCard}>
                  <Text style={s.productTitle}>{p.name}</Text>
                  <Text style={s.productMeta}>
                    Qty {p.qty} · Comp {p.comp} · {formatInr(p.price * p.qty)}
                  </Text>
                </View>
              ))}
              <View style={s.summaryCard}>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabelBold}>Grand Total</Text>
                  <Text style={s.summaryTotal}>{formatInr(computed.grandTotal)}</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabelBold}>Balance Due</Text>
                  <Text style={[s.summaryTotal, { color: '#d97706' }]}>{formatInr(computed.balance)}</Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>

        <View style={s.footer}>
          {step === 4 ? (
            <>
              <TouchableOpacity
                style={s.btnOutline}
                disabled={submitting !== null}
                onPress={() => void handleSaveDraft()}
              >
                {submitting === 'draft' ? (
                  <ActivityIndicator color="#ea580c" />
                ) : (
                  <Text style={s.btnOutlineText}>Save Draft</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btnPrimary, { flex: 1 }]}
                disabled={submitting !== null}
                onPress={() => void handleConfirm()}
              >
                {submitting === 'confirm' ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.btnPrimaryText}>{editingOrderId ? 'Update Order' : 'Confirm Order'}</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[s.btnPrimary, { flex: 1 }, !canContinue() && s.btnDisabled]}
              disabled={!canContinue()}
              onPress={handleNext}
            >
              <Text style={s.btnPrimaryText}>{step === 3 ? 'Review' : 'Continue'}</Text>
            </TouchableOpacity>
          )}
        </View>

        <OptionPicker
          visible={orderTypePicker}
          title="Order Type"
          options={[...ORDER_TYPE_OPTIONS]}
          onSelect={(v) => setFinancial((f) => ({ ...f, orderType: v as FinancialDetails['orderType'] }))}
          onClose={() => setOrderTypePicker(false)}
        />
        <OptionPicker
          visible={categoryPicker}
          title="Category"
          options={[...CATEGORY_OPTIONS]}
          onSelect={(v) => setFinancial((f) => ({ ...f, category: v as FinancialDetails['category'] }))}
          onClose={() => setCategoryPicker(false)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#6b7280' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 12,
  },
  backBtn: { padding: 4 },
  topTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#111827' },
  stepper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  stepItem: { alignItems: 'center', flex: 1 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: '#ea580c' },
  stepDotText: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  stepDotTextActive: { color: '#fff' },
  stepLabel: { fontSize: 10, color: '#9ca3af', marginTop: 4, fontWeight: '600' },
  stepLabelActive: { color: '#ea580c' },
  body: { flex: 1 },
  bodyContent: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 12 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 10,
    color: '#111827',
  },
  schoolCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  schoolCardSelected: { borderColor: '#ea580c', backgroundColor: '#fff7ed' },
  schoolName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  schoolMeta: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  checkIcon: { position: 'absolute', top: 14, right: 14 },
  muted: { color: '#6b7280', fontSize: 14, marginBottom: 12 },
  catalogCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    gap: 8,
  },
  catalogActions: { flexDirection: 'row', gap: 6 },
  smallBtnPrimary: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  smallBtnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  smallBtnDanger: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  productTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  productMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  dashedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#fdba74',
    marginTop: 8,
  },
  dashedBtnText: { color: '#ea580c', fontWeight: '600' },
  customForm: { marginTop: 8, padding: 12, backgroundColor: '#fff', borderRadius: 10 },
  row: { flexDirection: 'row', gap: 10, marginTop: 8 },
  addedCard: {
    backgroundColor: '#fff7ed',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fed7aa',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  qtyText: { fontSize: 16, fontWeight: '700', minWidth: 28, textAlign: 'center' },
  lineTotal: { marginLeft: 'auto', fontWeight: '700', color: '#ea580c' },
  finProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  finProductName: { flex: 1, fontSize: 13, fontWeight: '600' },
  compInput: {
    width: 56,
    height: 40,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    textAlign: 'center',
    backgroundColor: '#f9fafb',
  },
  selectField: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  fieldLabel: { fontSize: 12, color: '#6b7280', fontWeight: '600', marginBottom: 4 },
  fieldValue: { fontSize: 15, color: '#111827', fontWeight: '600' },
  fieldPlaceholder: { fontSize: 15, color: '#9ca3af' },
  errorText: { color: '#dc2626', fontSize: 12, marginTop: -6, marginBottom: 8 },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  docName: { flex: 1, fontSize: 13, color: '#374151' },
  uploadBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#e5e7eb',
    marginBottom: 16,
    gap: 8,
  },
  uploadText: { color: '#6b7280', fontSize: 14 },
  summaryCard: {
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fed7aa',
    marginTop: 8,
  },
  summaryTitle: { fontSize: 15, fontWeight: '800', color: '#ea580c', marginBottom: 12 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  summaryLabel: { fontSize: 13, color: '#6b7280', flex: 1 },
  summaryLabelBold: { fontSize: 14, fontWeight: '700', color: '#111827', flex: 1 },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  summaryTotal: { fontSize: 16, fontWeight: '800', color: '#ea580c' },
  amountInput: {
    width: 100,
    height: 36,
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 8,
    textAlign: 'right',
    paddingHorizontal: 8,
    backgroundColor: '#fff',
    fontSize: 14,
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  reviewLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600', marginTop: 8 },
  reviewValue: { fontSize: 15, fontWeight: '600', color: '#111827' },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  btnPrimary: {
    backgroundColor: '#ea580c',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnOutline: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fed7aa',
    minHeight: 48,
    justifyContent: 'center',
  },
  btnOutlineText: { color: '#ea580c', fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  pickerTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  pickerItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  pickerItemText: { fontSize: 16, color: '#111827' },
  pickerClose: { marginTop: 12, padding: 14, alignItems: 'center' },
  pickerCloseText: { color: '#ea580c', fontWeight: '700' },
});
