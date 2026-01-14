import { GridItem } from "@chakra-ui/react";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  area?: string;
  justifyContent?: string;
  alignSelf?: string;
  padding?: string;
}

export const Cell = ({
  children,
  padding,
  area,
  justifyContent,
  alignSelf,
}: Props) => (
  <GridItem
    area={area}
    justifyContent={justifyContent}
    padding={padding}
    alignSelf={alignSelf}
    overflow="auto"
    sx={{
      "&::-webkit-scrollbar": {
        width: "7px",
        height: "7px",
        borderRadius: "12px",
        backgroundColor: "rgba(0, 0, 0, 0.05)",
      },
      "&::-webkit-scrollbar-thumb": {
        backgroundColor: "rgba(0, 0, 0, 0.25)",
      },
    }}
  >
    {children}
  </GridItem>
);
