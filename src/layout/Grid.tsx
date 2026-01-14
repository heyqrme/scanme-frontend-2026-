import { Grid as ChakraGrid } from "@chakra-ui/react";
import type { ReactNode } from "react";

export interface GridConfig {
  templateAreas: string;
  rowGap: string;
  columnGap: string;
  templateColumns: string;
  templateRows: string;
}

interface Props {
  children: ReactNode;
  config: GridConfig;
  padding?: string;
  backgroundColor?: string;
}

export const Grid = ({ children, backgroundColor, padding, config }: Props) => {
  return (
    <ChakraGrid
      height="100vh"
      width="100vw"
      overflow="auto"
      padding={padding}
      backgroundColor={backgroundColor}
      {...config}
    >
      {children}
    </ChakraGrid>
  );
};
