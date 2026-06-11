import React, { ReactNode, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ADMIN_LIST_GRID_GAP } from './useAdminListLayout';

type Props<T> = {
  data: T[];
  columns: number;
  gap?: number;
  /** Fixed cell width on tablet so card footers stay inside the column. */
  gridCellWidth?: number;
  keyExtractor: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => ReactNode;
};

/** Non-scrollable grid — avoids FlatList swallowing nested card scroll gestures. */
export default function AdminGridList<T>({
  data,
  columns,
  gap = ADMIN_LIST_GRID_GAP,
  gridCellWidth,
  keyExtractor,
  renderItem,
}: Props<T>) {
  const rows = useMemo(() => {
    const result: T[][] = [];
    for (let i = 0; i < data.length; i += columns) {
      result.push(data.slice(i, i + columns));
    }
    return result;
  }, [data, columns]);

  return (
    <View style={[styles.list, { gap }]}>
      {rows.map((row, rowIndex) => (
        <View key={`grid-row-${rowIndex}`} style={[styles.row, { gap }]}>
          {row.map((item, colIndex) => {
            const index = rowIndex * columns + colIndex;
            return (
              <View
                key={keyExtractor(item, index)}
                style={[
                  styles.cell,
                  gridCellWidth != null && {
                    width: gridCellWidth,
                    maxWidth: gridCellWidth,
                    flex: 0,
                  },
                ]}
              >
                {renderItem(item, index)}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    width: '100%',
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  cell: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
});
