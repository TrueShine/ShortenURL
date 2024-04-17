import logo from "./images/logo_j1n.uk.png";
import * as React from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { Box } from "@mui/material";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#1976d2",
    },
  },
});

function App() {
  return (
    <React.Fragment>
      <ThemeProvider theme={darkTheme}>
        <AppBar position="static" color="primary">
          <Toolbar sx={{ justifyContent: "center" }}>
            <Box
              component="img"
              sx={{
                width: 120,
              }}
              alt="J1N.UK Logo"
              src={logo}
            />
          </Toolbar>
        </AppBar>
      </ThemeProvider>
    </React.Fragment>
  );
}

export default App;
