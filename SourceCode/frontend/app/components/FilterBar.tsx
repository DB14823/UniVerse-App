import React from "react";
import { View, TextInput, StyleSheet, Text } from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { Ionicons } from "@expo/vector-icons";
import { colours } from "../../lib/theme/colours";

type Item = { label: string; value: string };

interface FilterBarProps {
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  selectedValue: string;
  onSelectValue: (v: string) => void;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  items: Item[];
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
  placeholder?: string;
  // Optional category filter
  categoryValue?: string;
  onSelectCategory?: (v: string) => void;
  categoryOpen?: boolean;
  setCategoryOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  categoryItems?: Item[];
  setCategoryItems?: React.Dispatch<React.SetStateAction<Item[]>>;
  categoryPlaceholder?: string;
}

export default function FilterBar({
  searchQuery,
  setSearchQuery,
  selectedValue,
  onSelectValue,
  open,
  setOpen,
  items,
  setItems,
  placeholder = "Day",
  categoryValue,
  onSelectCategory,
  categoryOpen,
  setCategoryOpen,
  categoryItems,
  setCategoryItems,
  categoryPlaceholder = "Category",
}: FilterBarProps) {
  const showCategoryFilter = categoryValue !== undefined && onSelectCategory;

  return (
    <View style={styles.container} accessibilityRole="search">
      {/* Full-width search bar */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search events..."
          placeholderTextColor="rgba(255,255,255,0.55)"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          returnKeyType="search"
        />
        <Ionicons name="search" size={18} color={colours.textSecondary} />
      </View>

      {/* Dropdowns side by side */}
      <View style={styles.dropdownsRow}>
        {showCategoryFilter && categoryOpen !== undefined && setCategoryOpen && categoryItems && setCategoryItems && (
          <View style={styles.dropdownWrap}>
            <DropDownPicker
              open={categoryOpen}
              value={categoryValue}
              items={categoryItems}
              setOpen={setCategoryOpen}
              setValue={(val: any) => {
                if (typeof val === "function") {
                  const resolved = val(categoryValue);
                  onSelectCategory(resolved);
                } else {
                  onSelectCategory(val as string);
                }
              }}
              setItems={setCategoryItems}
              placeholder={categoryPlaceholder}
              style={[styles.dropdown, categoryOpen && styles.dropdownOpen]}
              dropDownContainerStyle={[
                styles.dropdownContainer,
                categoryOpen && styles.dropdownContainerOpen,
              ]}
              textStyle={styles.dropdownText}
              labelStyle={styles.dropdownLabel}
              placeholderStyle={styles.dropdownPlaceholder}
              listItemLabelStyle={styles.dropdownItemLabel}
              listItemContainerStyle={styles.dropdownItemContainer}
              ArrowUpIconComponent={() => (
                <Ionicons name="chevron-up" size={16} color={colours.textSecondary} />
              )}
              ArrowDownIconComponent={() => (
                <Ionicons name="chevron-down" size={16} color={colours.textSecondary} />
              )}
              TickIconComponent={() => (
                <Ionicons name="checkmark" size={16} color={colours.secondary} />
              )}
              listMode="SCROLLVIEW"
              zIndex={1000}
              zIndexInverse={1000}
            />
          </View>
        )}

        <View style={styles.dropdownWrap}>
          <DropDownPicker
            open={open}
            value={selectedValue}
            items={items}
            setOpen={setOpen}
            setValue={(val: any) => {
              if (typeof val === "function") {
                const resolved = val(selectedValue);
                onSelectValue(resolved);
              } else {
                onSelectValue(val as string);
              }
            }}
            setItems={setItems}
            placeholder={placeholder}
            style={[styles.dropdown, open && styles.dropdownOpen]}
            dropDownContainerStyle={[
              styles.dropdownContainer,
              open && styles.dropdownContainerOpen,
            ]}
            textStyle={styles.dropdownText}
            labelStyle={styles.dropdownLabel}
            placeholderStyle={styles.dropdownPlaceholder}
            listItemLabelStyle={styles.dropdownItemLabel}
            listItemContainerStyle={styles.dropdownItemContainer}
            ArrowUpIconComponent={() => (
              <Ionicons name="chevron-up" size={16} color={colours.textSecondary} />
            )}
            ArrowDownIconComponent={() => (
              <Ionicons name="chevron-down" size={16} color={colours.textSecondary} />
            )}
            TickIconComponent={() => (
              <Ionicons name="checkmark" size={16} color={colours.secondary} />
            )}
            listMode="SCROLLVIEW"
            zIndex={500}
            zIndexInverse={500}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: colours.background,
  },

  searchWrap: {
    height: 44,
    borderRadius: 999,
    backgroundColor: colours.glass,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colours.border,
    marginBottom: 8,
  },

  searchInput: {
    flex: 1,
    color: colours.textPrimary,
    fontSize: 15,
    paddingRight: 10,
  },


  dropdownsRow: {
    flexDirection: "row",
    gap: 10,
  },

  dropdownWrap: {
    flex: 1,
    height: 40,
  },

  dropdown: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    height: 40,
  },

  dropdownOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },

  dropdownContainer: {
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: 10,
    backgroundColor: colours.surfaceElevated,
    elevation: 8,
  },

  dropdownContainerOpen: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },

  dropdownText: {
    color: colours.textPrimary,
    fontWeight: "700",
    fontSize: 12,
  },

  dropdownLabel: {
    color: colours.textPrimary,
  },

  dropdownPlaceholder: {
    color: "rgba(255,255,255,0.55)",
    fontWeight: "700",
    fontSize: 12,
  },

  dropdownItemContainer: {
    backgroundColor: "transparent",
  },

  dropdownItemLabel: {
    color: colours.textPrimary,
    fontWeight: "600",
    fontSize: 13,
  },
});
