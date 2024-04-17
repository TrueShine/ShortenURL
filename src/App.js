import logo from "./images/logo_j1n.uk.png";
import * as React from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { Box, Container, Link } from "@mui/material";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import { styled } from "@mui/system";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#f0f0f0", // 배경색 설정
    },
    primary: {
      main: "#000000",
    },
  },
});

// 툴바를 화면 하단에 고정시키는 스타일을 적용한 AppBar 컴포넌트
const BottomAppBar = styled(AppBar)({
  top: "auto",
  bottom: 0,
  backgroundColor: "#00000000",
  justifyContent: "center",
});

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <AppBar position="static" elevation={0}>
        <Toolbar sx={{ justifyContent: "center" }}>
          <Link href="/">
            <Box
              component="img"
              sx={{
                width: 120,
              }}
              alt="J1N.UK Logo"
              src={logo}
            />
          </Link>
        </Toolbar>
      </AppBar>
      <Container sx={{ paddingTop: 10, height: 100 }}>
        <Card sx={{ minWidth: 375 }}>
          <Typography sx={{ fontSize: 14 }}>URL Shortener.</Typography>
        </Card>
      </Container>
      <BottomAppBar position="fixed" elevation={0}>
        <Toolbar sx={{ justifyContent: "center" }}>
          <Typography variant="h10" color="">
            Copyright 2024. j1n.uk
          </Typography>
        </Toolbar>
      </BottomAppBar>
    </ThemeProvider>
  );
}

export default App;
